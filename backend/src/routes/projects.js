const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path instead of relative 'uploads/'
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Also sanitize filename to remove spaces
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({ storage });

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
      LEFT JOIN status s ON p.status_id = s.status_id
      LEFT JOIN priority pr ON p.priority_id = pr.priority_id
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

// POST new project - Protected route with file upload and error handling
router.post('/', authenticate, (req, res, next) => {
  upload.array('documents')(req, res, (err) => {
    if (err) {
      console.error('Multer error on POST:', err);
      return res.status(500).json({ error: 'File upload failed: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      estimatedEffort
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

    // Format documents with proper structure from uploaded files
    const formattedDocuments = (req.files || []).map(file => ({
      documentID: Date.now().toString(),
      fileName: file.originalname,        // ← original name for display
      fileStoreName: file.filename,        // ← multer name for storage
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: `http://localhost:5000/uploads/${file.filename}`,
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

// UPDATE project with file upload and error handling
router.put('/:id', (req, res, next) => {
  upload.array('documents')(req, res, (err) => {
    if (err) {
      console.error('Multer error on PUT:', err);
      return res.status(500).json({ error: 'File upload failed: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedEffort,
      existingDocuments = []
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

    // Parse existing documents if they're sent as a string
    let parsedExistingDocuments = [];
    if (existingDocuments) {
      try {
        parsedExistingDocuments = typeof existingDocuments === 'string' 
          ? JSON.parse(existingDocuments) 
          : existingDocuments;
      } catch (e) {
        console.error('Error parsing existing documents:', e);
      }
    }

    // Format new uploaded documents
    const newDocuments = (req.files || []).map(file => ({
      documentID: Date.now().toString() + Math.random(),
      fileName: file.originalname,        // ← original name for display
      fileStoreName: file.filename,        // ← multer name for storage
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: `http://localhost:5000/uploads/${file.filename}`,
      uploadedDate: new Date()
    }));

    // Combine existing and new documents
    const allDocuments = [...parsedExistingDocuments, ...newDocuments];

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
        JSON.stringify(allDocuments),
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
      LEFT JOIN status s ON p.status_id = s.status_id
      LEFT JOIN priority pr ON p.priority_id = pr.priority_id
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