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
        COALESCE(p.timelines, '[]') AS timelines,
        p.task_id AS "taskId"
      FROM projects p
      JOIN tasks t ON p.task_id = t.task_id
      JOIN status s ON t.status_id = s.status_id
      JOIN priority pr ON t.priority_id = pr.priority_id
      ORDER BY p.created_at DESC
    `);

    // Parse JSON strings for documents and timelines
    result.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
      if (typeof p.timelines === "string") {
        p.timelines = JSON.parse(p.timelines);
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
      documents = [],
      timelines = []
    } = req.body;

    // fallback: assign to creator if not provided
    const reporterId = req.user.userId;
    const finalAssignedUserId = assignedUserId || reporterId;

    // Start a transaction
    await db.query('BEGIN');

    // Convert public ID → internal numeric ID only if provided
    let internalAssignedUserId = finalAssignedUserId;

    if (typeof finalAssignedUserId === "string" && finalAssignedUserId.startsWith("USR-")) {
      const userResult = await db.query(
        `SELECT user_id FROM users WHERE public_user_id = $1`,
        [finalAssignedUserId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("Assigned user not found");
      }

      internalAssignedUserId = userResult.rows[0].user_id;
    }

    // Create task FIRST
    const taskResult = await db.query(`
      INSERT INTO tasks
      (title, assigned_to_user_id, reported_by_user_id,
       status_id, priority_id, creation_date, due_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING task_id
    `, [
      title,
      internalAssignedUserId,
      reporterId,
      1, // default status = To Do
      1, // default priority = Low (priority_id 1)
      new Date(),
      dueDate
    ]);

    const newTaskId = taskResult.rows[0].task_id;

    // Format documents with proper structure
    const formattedDocuments = documents.map(doc => ({
      documentID: doc.documentID || Date.now().toString(),
      fileName: doc.fileName || doc.name,
      fileType: doc.fileType || doc.type,
      fileSize: doc.fileSize || doc.size,
      fileData: doc.fileData || doc.url,
      uploadedDate: new Date()
    }));

    // Insert project WITH task link
    const projectResult = await db.query(
      `INSERT INTO projects
      (project_id, title, description,
       due_date, estimated_effort, documents,
       timelines, task_id, approval_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        'PRJ-' + Date.now(),
        title,
        description,
        dueDate,
        estimatedEffort,
        JSON.stringify(formattedDocuments),
        JSON.stringify(timelines),
        newTaskId,
        null // approval_status starts as null
      ]
    );

    // Commit the transaction
    await db.query('COMMIT');

    res.json(projectResult.rows[0]);
  } catch (err) {
    // Rollback in case of error
    await db.query('ROLLBACK');
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
      documents = [],
      timelines = []
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

    // Start a transaction
    await db.query('BEGIN');

    // Format documents with proper structure
    const formattedDocuments = documents.map(doc => ({
      documentID: doc.documentID || Date.now().toString(),
      fileName: doc.fileName || doc.name,
      fileType: doc.fileType || doc.type,
      fileSize: doc.fileSize || doc.size,
      fileData: doc.fileData || doc.url,
      uploadedDate: new Date()
    }));

    // update project info
    const projectResult = await db.query(
      `UPDATE projects SET
        title=$1,
        description=$2,
        due_date=$3,
        estimated_effort=$4,
        documents=$5,
        timelines=$6,
        approval_status = COALESCE($7, approval_status)
      WHERE task_id = $8
      RETURNING task_id`,
      [
        title,
        description,
        dueDate,
        estimatedEffort,
        JSON.stringify(formattedDocuments),
        JSON.stringify(timelines),
        approvalStatus,
        id
      ]
    );

    if (projectResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    const taskId = projectResult.rows[0].task_id;

    // update task status & priority
    await db.query(
      `UPDATE tasks
       SET status_id=$1,
           priority_id=$2
       WHERE task_id=$3`,
      [statusId, priorityId, taskId]
    );

    // Commit the transaction
    await db.query('COMMIT');

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
        COALESCE(p.timelines, '[]') AS timelines,
        p.task_id AS "taskId"
      FROM projects p
      JOIN tasks t ON p.task_id = t.task_id
      JOIN status s ON t.status_id = s.status_id
      JOIN priority pr ON t.priority_id = pr.priority_id
      WHERE p.task_id = $1
    `, [id]);

    // Parse JSON strings for documents and timelines
    updatedProject.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
      if (typeof p.timelines === "string") {
        p.timelines = JSON.parse(p.timelines);
      }
    });

    res.json(updatedProject.rows[0]);

  } catch (err) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('PUT project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ADMIN APPROVE / REJECT PROJECT
router.put('/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" or "reject"

    await db.query('BEGIN');

    if (action === 'approve') {
      await db.query(
        `UPDATE projects
         SET approval_status = 'Approved'
         WHERE task_id = $1`,
        [id]
      );
    }

    if (action === 'reject') {
      // move back to Revision Required
      const statusResult = await db.query(
        `SELECT status_id FROM status
         WHERE status_name = 'Revision Required'`
      );

      const revisionStatusId = statusResult.rows[0].status_id;

      await db.query(
        `UPDATE tasks
         SET status_id = $1
         WHERE task_id = $2`,
        [revisionStatusId, id]
      );

      await db.query(
        `UPDATE projects
         SET approval_status = 'Rejected'
         WHERE task_id = $1`,
        [id]
      );
    }

    await db.query('COMMIT');

    res.json({ success: true });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// DELETE project
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    await db.query('BEGIN');

    const projectResult = await db.query(
      `SELECT task_id FROM projects WHERE project_id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    const taskId = projectResult.rows[0].task_id;

    await db.query(
      `DELETE FROM projects WHERE project_id = $1`,
      [projectId]
    );

    await db.query(
      `DELETE FROM tasks WHERE task_id = $1`,
      [taskId]
    );

    await db.query('COMMIT');

    res.json({ success: true });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DELETE project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;