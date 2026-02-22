const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/auth.middleware');

// GET all projects
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        p.approval_status AS "approvalStatus",
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.estimated_effort AS "estimatedEffort",
        p.created_at AS "createdAt",
        COALESCE(p.documents, '[]') AS documents,
        p.status_id AS "statusId",
        p.priority_id AS "priorityId"
      FROM projects p
      JOIN status s ON p.status_id = s.status_id
      JOIN priority pr ON p.priority_id = pr.priority_id
      ORDER BY p.created_at DESC
    `);

    // Parse JSON strings for documents
    result.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
    });

    res.json(result.rows);
  } catch (err) {
    console.error('GET projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST new project - Protected route
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      estimatedEffort,
      assignedUserId,
      documents = []
    } = req.body;

    // Get default status and priority IDs
    const statusResult = await db.query(
      `SELECT status_id FROM status WHERE status_name = 'To Do'`
    );

    const priorityResult = await db.query(
      `SELECT priority_id FROM priority WHERE priority_level = 'Low'`
    );

    const statusId = statusResult.rows[0].status_id;
    const priorityId = priorityResult.rows[0].priority_id;

    // Format documents with proper structure
    const formattedDocuments = documents.map(doc => ({
      documentID: doc.documentID || Date.now().toString(),
      fileName: doc.fileName || doc.name,
      fileType: doc.fileType || doc.type,
      fileSize: doc.fileSize || doc.size,
      fileData: doc.fileData || doc.url,
      uploadedDate: new Date()
    }));

    // Insert project with status_id and priority_id
    const projectResult = await db.query(
      `INSERT INTO projects
      (project_id, title, description,
       due_date, estimated_effort,
       documents,
       approval_status,
       status_id, priority_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        'PRJ-' + Date.now(),
        title,
        description,
        dueDate,
        estimatedEffort,
        JSON.stringify(formattedDocuments),
        null, // approval_status starts as null
        statusId,
        priorityId
      ]
    );

    res.json(projectResult.rows[0]);
  } catch (err) {
    console.error('POST project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// UPDATE project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedEffort,
      documents = []
    } = req.body;

    // normalize helper
    const normalize = (s) =>
      s?.toLowerCase().replace(/[\s_-]/g, '');

    // normalize incoming values
    const normalizedStatus = normalize(status);
    
    // Set approval status if status is completed
    let approvalStatus = null;
    if (normalizedStatus === 'completed') {
      approvalStatus = 'Pending';
    }
    
    // Handle empty or missing priority values - default to 'Low'
    const safePriority = priority && priority.trim() !== ''
      ? priority
      : 'Low';
    
    const normalizedPriority = normalize(safePriority);

    // fetch lookup tables
    const statusResult = await db.query(`SELECT status_id, status_name FROM status`);
    const priorityResult = await db.query(`SELECT priority_id, priority_level FROM priority`);

    // match values safely
    const statusRow = statusResult.rows.find(
      r => normalize(r.status_name) === normalizedStatus
    );

    const priorityRow = priorityResult.rows.find(
      r => normalize(r.priority_level) === normalizedPriority
    );

    if (!statusRow || !priorityRow) {
      console.log("Mismatch:", { status, priority, safePriority });
      return res.status(400).json({ error: 'Invalid status or priority value' });
    }

    const statusId = statusRow.status_id;
    const priorityId = priorityRow.priority_id;

    // Format documents with proper structure
    const formattedDocuments = documents.map(doc => ({
      documentID: doc.documentID || Date.now().toString(),
      fileName: doc.fileName || doc.name,
      fileType: doc.fileType || doc.type,
      fileSize: doc.fileSize || doc.size,
      fileData: doc.fileData || doc.url,
      uploadedDate: new Date()
    }));

    // update project info directly
    const projectResult = await db.query(
      `UPDATE projects SET
        title=$1,
        description=$2,
        due_date=$3,
        estimated_effort=$4,
        documents=$5,
        approval_status = COALESCE($6, approval_status),
        status_id=$7,
        priority_id=$8
      WHERE id = $9
      RETURNING id`,
      [
        title,
        description,
        dueDate,
        estimatedEffort,
        JSON.stringify(formattedDocuments),
        approvalStatus,
        statusId,
        priorityId,
        id
      ]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch the updated project with joins to return complete data
    const updatedProject = await db.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        p.approval_status AS "approvalStatus",
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.estimated_effort AS "estimatedEffort",
        p.created_at AS "createdAt",
        COALESCE(p.documents, '[]') AS documents,
        p.status_id AS "statusId",
        p.priority_id AS "priorityId"
      FROM projects p
      JOIN status s ON p.status_id = s.status_id
      JOIN priority pr ON p.priority_id = pr.priority_id
      WHERE p.id = $1
    `, [id]);

    // Parse JSON strings for documents
    updatedProject.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
    });

    res.json(updatedProject.rows[0]);

  } catch (err) {
    console.error('PUT project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ADMIN APPROVE / REJECT PROJECT
router.put('/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" or "reject"

    if (action === 'approve') {
      await db.query(
        `UPDATE projects
         SET approval_status = 'Approved'
         WHERE id = $1`,
        [id]
      );
    }

    if (action === 'reject') {
      // Get the status ID for 'Revision Required'
      const statusResult = await db.query(
        `SELECT status_id FROM status
         WHERE status_name = 'Revision Required'`
      );

      const revisionStatusId = statusResult.rows[0].status_id;

      await db.query(
        `UPDATE projects
         SET approval_status = 'Rejected',
             status_id = $1
         WHERE id = $2`,
        [revisionStatusId, id]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const projectResult = await db.query(
      `DELETE FROM projects WHERE id = $1 RETURNING id`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;