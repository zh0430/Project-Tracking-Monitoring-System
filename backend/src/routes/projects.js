const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * PROJECT MANAGEMENT ROUTES
 * Handles full CRUD operations for projects including file uploads, document management,
 * milestone tracking, user assignments, and project approvals.
 * Most routes require authentication. Supports file uploads via multer middleware.
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path instead of relative 'uploads/'
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Also sanitize filename to remove spaces
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});

const upload = multer({ storage });

// Helper function for normalization
const normalize = (s) =>
  s?.toLowerCase().replace(/[\s_-]/g, '');

// GET all projects for authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        (
          SELECT COALESCE(json_agg(u.public_user_id), '[]')
          FROM project_assignments pa
          JOIN users u ON pa.user_id = u.user_id
          WHERE pa.project_id = p.id
        ) AS "assignedToUserIDs",
        p.approval_status AS "approvalStatus",
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.created_at AS "createdAt",
        p.completed_at AS "completedAt",
        COALESCE(p.documents, '[]') AS documents,
        p.status_id AS "statusId",
        p.priority_id AS "priorityId",
        (
          SELECT COALESCE(json_agg(
            jsonb_build_object(
              'id', m.milestone_id,
              'title', m.title,
              'description', m.description,
              'startDate', m.start_date,
              'endDate', m.end_date,
              'status', s2.status_name,
              'priority', pr2.priority_level
            )
          ), '[]')
          FROM project_milestones m
          LEFT JOIN status s2 ON m.status_id = s2.status_id
          LEFT JOIN priority pr2 ON m.priority_id = pr2.priority_id
          WHERE m.project_id = p.id
        ) AS timelines
      FROM projects p
      LEFT JOIN status s ON p.status_id = s.status_id
      LEFT JOIN priority pr ON p.priority_id = pr.priority_id
      WHERE EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = p.id
        AND pa.user_id = $1
      )
      ORDER BY p.created_at DESC
    `, [userId]);

    // Parse JSON strings for documents and timelines
    result.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
      
      // Normalize document formats and remove broken ones
      p.documents = p.documents.map(doc => {
        // ❌ REMOVE broken ones
        if (
          (doc.url && doc.url.includes("undefined")) ||
          (doc.fileData && doc.fileData.includes("undefined"))
        ) {
          return null; // mark for removal
        }

        // ✅ user upload
        if (doc.url && doc.url.startsWith("http")) {
          return {
            ...doc,
            fileData: doc.url
          };
        }

        // ✅ multer upload
        if (doc.fileStoreName) {
          return {
            ...doc,
            fileData: `http://localhost:5000/uploads/${doc.fileStoreName}`
          };
        }

        // ✅ already correct
        if (doc.fileData && doc.fileData.startsWith("http")) {
          return doc;
        }

        return doc;
      }).filter(Boolean); // 🔥 remove nulls

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
  console.log("BODY:", req.body);
  try {
    const {
      title,
      description,
      dueDate,
      assignedUserId,
      status,
      priority
    } = req.body;

    // Get status ID with normalization
    const allStatus = await db.query(`SELECT status_id, status_name FROM status`);
    
    const matchedStatus = allStatus.rows.find(
      s => normalize(s.status_name) === normalize(status)
    );
    
    const statusId = matchedStatus
      ? matchedStatus.status_id
      : allStatus.rows.find(s => s.status_name === 'To Do')?.status_id;

    // Get priority ID with normalization
    const allPriority = await db.query(`SELECT priority_id, priority_level FROM priority`);
    
    const matchedPriority = allPriority.rows.find(
      p => normalize(p.priority_level) === normalize(priority)
    );
    
    const priorityId = matchedPriority
      ? matchedPriority.priority_id
      : allPriority.rows.find(p => p.priority_level === 'Not set')?.priority_id;

    // Handle documents from both uploaded files and existing documents in req.body
    let formattedDocuments = [];

    // First, process existing documents from req.body.documents
    if (req.body.documents) {
      try {
        formattedDocuments = typeof req.body.documents === "string"
          ? JSON.parse(req.body.documents)
          : req.body.documents;
      } catch (err) {
        console.error("Error parsing documents:", err);
      }
    }

    // Then, add uploaded files (if any)
    const uploadedFiles = (req.files || []).map(file => ({
      documentID: Date.now().toString(),
      fileName: file.originalname,
      fileStoreName: file.filename,
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: `http://localhost:5000/uploads/${file.filename}`,
      uploadedDate: new Date()
    }));

    // Combine existing documents with uploaded files
    formattedDocuments = [...formattedDocuments, ...uploadedFiles];

    // Create ONE project without assigned_to_user_id
    const projectResult = await db.query(
      `INSERT INTO projects
      (project_id, title, description,
       due_date,
       documents,
       approval_status,
       status_id, priority_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, project_id`,
      [
        'PRJ-' + Date.now(),
        title,
        description,
        dueDate || null,
        JSON.stringify(formattedDocuments),
        'Pending', // approval_status starts as 'Pending'
        statusId,
        priorityId
      ]
    );

    const projectId = projectResult.rows[0].id;

    // Parse assignedUserId - could be JSON string or array
    let userIds = assignedUserId;
    
    if (typeof assignedUserId === "string") {
      try {
        userIds = JSON.parse(assignedUserId);
      } catch {
        userIds = [assignedUserId];
      }
    }

    // Ensure userIds is an array
    if (!Array.isArray(userIds)) {
      userIds = [userIds];
    }

    // Insert MULTIPLE assignments to project_assignments table
    for (const userId of userIds) {
      // Convert public_user_id to internal user_id
      let internalUserId = null;
      
      if (userId) {
        const userResult = await db.query(
          `SELECT user_id FROM users WHERE public_user_id = $1`,
          [userId]
        );
        
        if (userResult.rows.length > 0) {
          internalUserId = userResult.rows[0].user_id;
        }
      }
      
      if (internalUserId) {
        await db.query(`
          INSERT INTO project_assignments (project_id, user_id)
          VALUES ($1, $2)
        `, [projectId, internalUserId]);
      }
    }

    // ✅ INSERT TIMELINES AFTER PROJECT CREATED
    if (req.body.timelines) {
      let parsedTimelines = [];

      try {
        parsedTimelines =
          typeof req.body.timelines === "string"
            ? JSON.parse(req.body.timelines)
            : req.body.timelines;
      } catch (err) {
        console.error("POST timeline parse error:", err);
      }

      for (const tl of parsedTimelines) {
        // get status_id
        const statusRes = await db.query(
          `SELECT status_id FROM status WHERE status_name = $1`,
          [tl.status]
        );

        // get priority_id
        const priorityRes = await db.query(
          `SELECT priority_id FROM priority WHERE priority_level = $1`,
          [tl.priority || "Not set"]
        );

        let priorityId = priorityRes.rows[0]?.priority_id;

        if (!priorityId) {
          return res.status(400).json({ error: "Invalid timeline priority" });
        }

        await db.query(`
          INSERT INTO project_milestones
          (project_id, title, description, start_date, end_date, status_id, priority_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [
          projectId,
          tl.title,
          tl.description || '',
          tl.startDate,
          tl.endDate,
          statusRes.rows[0]?.status_id || null,
          priorityId
        ]);
      }
    }

    // Fetch the created project with assignments using subqueries
    const createdProject = await db.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        (
          SELECT COALESCE(json_agg(u.public_user_id), '[]')
          FROM project_assignments pa
          JOIN users u ON pa.user_id = u.user_id
          WHERE pa.project_id = p.id
        ) AS "assignedToUserIDs",
        p.approval_status AS "approvalStatus",
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.created_at AS "createdAt",
        p.completed_at AS "completedAt",
        COALESCE(p.documents, '[]') AS documents,
        p.status_id AS "statusId",
        p.priority_id AS "priorityId",
        (
          SELECT COALESCE(json_agg(
            jsonb_build_object(
              'id', m.milestone_id,
              'title', m.title,
              'description', m.description,
              'startDate', m.start_date,
              'endDate', m.end_date,
              'status', s2.status_name,
              'priority', pr2.priority_level
            )
          ), '[]')
          FROM project_milestones m
          LEFT JOIN status s2 ON m.status_id = s2.status_id
          LEFT JOIN priority pr2 ON m.priority_id = pr2.priority_id
          WHERE m.project_id = p.id
        ) AS timelines
      FROM projects p
      LEFT JOIN status s ON p.status_id = s.status_id
      LEFT JOIN priority pr ON p.priority_id = pr.priority_id
      WHERE p.id = $1
    `, [projectId]);

    res.json(createdProject.rows[0]);
  } catch (err) {
    console.error('POST project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ✅ UPLOAD DOCUMENT ONLY (NEW CLEAN ROUTE)
router.post('/:id/upload', authenticate, (req, res, next) => {
  upload.array('documents')(req, res, (err) => {
    if (err) {
      console.error('Multer error on UPLOAD:', err);
      return res.status(500).json({ error: 'File upload failed: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  console.log("UPLOAD - BODY:", req.body);
  console.log("UPLOAD - FILES:", req.files);
  try {
    const { id } = req.params;

    // ✅ Get current project
    const projectResult = await db.query(
      `SELECT documents FROM projects WHERE id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let currentDocuments = projectResult.rows[0].documents || [];

    if (typeof currentDocuments === "string") {
      currentDocuments = JSON.parse(currentDocuments);
    }

    // ✅ Format new uploaded files
    const newDocuments = (req.files || []).map(file => ({
      documentID: Date.now().toString() + Math.random(),
      fileName: file.originalname,
      fileStoreName: file.filename,
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: `http://localhost:5000/uploads/${file.filename}`,
      uploadedDate: new Date()
    }));

    // ✅ Combine with existing
    const allDocuments = [...currentDocuments, ...newDocuments];

    // ✅ Save back to DB
    await db.query(
      `UPDATE projects
       SET documents = $1
       WHERE id = $2`,
      [JSON.stringify(allDocuments), id]
    );

    // ✅ Return ONLY new files (cleaner)
    res.json({
      success: true,
      documents: newDocuments
    });

  } catch (err) {
    console.error('UPLOAD route error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
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
  console.log("PUT - BODY:", req.body);
  console.log("PUT - FILES:", req.files);
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      existingDocuments = [],
      timelines
    } = req.body;

    // ✅ FIX 3 — PARSE timelines properly
    let parsedTimelines = [];

    if (timelines !== undefined) {
      try {
        parsedTimelines =
          typeof timelines === "string"
            ? JSON.parse(timelines)
            : timelines;
      } catch (err) {
        console.error("Timeline parse error:", err);
        parsedTimelines = [];
      }
    }

    // 🔥 GET EXISTING PROJECT DATA FIRST
    const existingProjectData = await db.query(
      `SELECT * FROM projects WHERE id = $1`,
      [id]
    );

    const existingProject = existingProjectData.rows[0];

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // THEN REPLACE VARIABLES WITH SAFE VALUES
    const safeTitle = title ?? existingProject.title;
    const safeDescription = description ?? existingProject.description;
    const safeDueDate = (dueDate && dueDate !== "") ? dueDate : existingProject.due_date;

    // normalize incoming values
    const normalizedStatus = normalize(status);
    
    // Get status ID for the new status
    let statusId;
    
    // fetch lookup tables for status
    const statusResult = await db.query(`SELECT status_id, status_name FROM status`);
    
    // ✅ Only validate if provided
    if (status) {
      const statusRow = statusResult.rows.find(
        r => normalize(r.status_name) === normalizedStatus
      );
      if (!statusRow) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      statusId = statusRow.status_id;
    }
    
    // Set approval status ONLY if status is changing to 'Completed'
    let approvalStatus = null;
    if (
      normalizedStatus === 'completed' &&
      existingProject.status_id !== statusId
    ) {
      approvalStatus = 'Pending';
    }

    // 🔥 ALWAYS resolve priority_id from DB with normalization
    let priorityId = null;
    
    const allPriority = await db.query(`SELECT priority_id, priority_level FROM priority`);
    
    const matchedPriority = allPriority.rows.find(
      p => normalize(p.priority_level) === normalize(priority)
    );
    
    priorityId = matchedPriority
      ? matchedPriority.priority_id
      : allPriority.rows.find(p => p.priority_level === 'Not set')?.priority_id;

    if (!priorityId) {
      return res.status(400).json({ error: "Invalid priority value" });
    }

    // Get current documents stored in DB
    const currentProject = await db.query(
      `SELECT documents FROM projects WHERE id = $1`,
      [id]
    );

    let currentDocuments = currentProject.rows[0]?.documents || [];

    if (typeof currentDocuments === "string") {
      currentDocuments = JSON.parse(currentDocuments);
    }

    // Parse documents coming from frontend - with normalization
    let parsedExistingDocuments = [];

    if (existingDocuments) {
      try {
        parsedExistingDocuments = (typeof existingDocuments === "string"
          ? JSON.parse(existingDocuments)
          : existingDocuments
        ).map(doc => {
          // ✅ user upload (has url)
          if (doc.url) {
            return {
              documentID: doc.id || Date.now().toString(),
              fileName: doc.name,
              fileSize: doc.size,
              fileType: doc.type,
              fileData: doc.url, // 🔥 normalize HERE
              uploadedDate: doc.uploadedAt || new Date()
            };
          }

          // ✅ already normalized (admin/multer)
          if (doc.fileData) {
            return doc;
          }

          return doc;
        });
      } catch (e) {
        console.error("Error parsing existing documents:", e);
      }
    }

    // Detect deleted files - updated to check both fileStoreName and fileData
    const removedDocs = currentDocuments.filter(oldDoc => {
      return !parsedExistingDocuments.some(
        newDoc =>
          newDoc.fileStoreName === oldDoc.fileStoreName ||
          newDoc.fileData === oldDoc.fileData
      );
    });

    // Delete removed files from uploads folder
    removedDocs.forEach(doc => {
      const storeName = doc.fileStoreName;

      if (!storeName) return;

      const filePath = path.join(__dirname, "../../uploads", storeName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

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
        documents=$4,
        approval_status = COALESCE($5, approval_status),
        status_id = COALESCE($6, status_id),
        priority_id = $7
      WHERE id = $8
      RETURNING id`,
      [
        safeTitle,
        safeDescription,
        safeDueDate,
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

    const projectId = parseInt(id);

    // 1. DELETE existing milestones - only if timelines is provided in the request
    if (timelines !== undefined) {
      // Only delete if frontend actually sends timelines
      await db.query(
        `DELETE FROM project_milestones WHERE project_id = $1`,
        [projectId]
      );

      // 2. INSERT all milestones again (if any)
      if (parsedTimelines && parsedTimelines.length > 0) {
        for (const tl of parsedTimelines) {
          // Get status_id for milestone status
          const statusRes = await db.query(
            `SELECT status_id FROM status WHERE status_name = $1`,
            [tl.status]
          );

          // Get priority_id for milestone priority
          const priorityRes = await db.query(
            `SELECT priority_id FROM priority WHERE priority_level = $1`,
            [tl.priority || "Not set"]
          );

          let priorityId = priorityRes.rows[0]?.priority_id;

          if (!priorityId) {
            return res.status(400).json({ error: "Invalid timeline priority" });
          }

          // Insert milestone
          await db.query(`
            INSERT INTO project_milestones
            (project_id, title, description, start_date, end_date, status_id, priority_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            projectId,
            tl.title,
            tl.description || '',
            tl.startDate,
            tl.endDate,
            statusRes.rows[0].status_id,
            priorityId
          ]);
        }
      }
    }

    // Fetch the updated project with joins to return complete data using subqueries
    const updatedProject = await db.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        (
          SELECT COALESCE(json_agg(u.public_user_id), '[]')
          FROM project_assignments pa
          JOIN users u ON pa.user_id = u.user_id
          WHERE pa.project_id = p.id
        ) AS "assignedToUserIDs",
        p.approval_status AS "approvalStatus",
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.created_at AS "createdAt",
        p.completed_at AS "completedAt",
        COALESCE(p.documents, '[]') AS documents,
        p.status_id AS "statusId",
        p.priority_id AS "priorityId",
        (
          SELECT COALESCE(json_agg(
            jsonb_build_object(
              'id', m.milestone_id,
              'title', m.title,
              'description', m.description,
              'startDate', m.start_date,
              'endDate', m.end_date,
              'status', s2.status_name,
              'priority', pr2.priority_level
            )
          ), '[]')
          FROM project_milestones m
          LEFT JOIN status s2 ON m.status_id = s2.status_id
          LEFT JOIN priority pr2 ON m.priority_id = pr2.priority_id
          WHERE m.project_id = p.id
        ) AS timelines
      FROM projects p
      LEFT JOIN status s ON p.status_id = s.status_id
      LEFT JOIN priority pr ON p.priority_id = pr.priority_id
      WHERE p.id = $1
    `, [id]);

    // Parse JSON strings for documents and timelines
    updatedProject.rows.forEach(p => {
      if (typeof p.documents === "string") {
        p.documents = JSON.parse(p.documents);
      }
      
      // Normalize document formats and remove broken ones
      p.documents = p.documents.map(doc => {
        // ❌ REMOVE broken ones
        if (
          (doc.url && doc.url.includes("undefined")) ||
          (doc.fileData && doc.fileData.includes("undefined"))
        ) {
          return null; // mark for removal
        }

        // ✅ user upload
        if (doc.url && doc.url.startsWith("http")) {
          return {
            ...doc,
            fileData: doc.url
          };
        }

        // ✅ multer upload
        if (doc.fileStoreName) {
          return {
            ...doc,
            fileData: `http://localhost:5000/uploads/${doc.fileStoreName}`
          };
        }

        // ✅ already correct
        if (doc.fileData && doc.fileData.startsWith("http")) {
          return doc;
        }

        return doc;
      }).filter(Boolean); // 🔥 remove nulls

      if (typeof p.timelines === "string") {
        p.timelines = JSON.parse(p.timelines);
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
  console.log("APPROVAL - BODY:", req.body);
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" or "reject"

    if (action === 'approve') {
      await db.query(
        `UPDATE projects
         SET approval_status = 'Approved',
             completed_at = NOW()
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
             completed_at = NULL,
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

// DELETE project with file cleanup
router.delete('/:id', async (req, res) => {
  console.log("DELETE - ID:", req.params.id);
  try {
    const { id } = req.params;

    // Get documents before deleting so we can clean up files
    const project = await db.query(
      `SELECT documents FROM projects WHERE id = $1`, [id]
    );

    if (project.rows.length > 0) {
      let documents = project.rows[0].documents || [];
      if (typeof documents === 'string') {
        documents = JSON.parse(documents);
      }

      documents.forEach((doc) => {
        // Try fileStoreName first, fall back to fileName
        const storeName = doc.fileStoreName || doc.fileName;

        if (storeName) {
          const filePath = path.join(__dirname, '../../uploads', storeName);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }

    // Delete from project_assignments first (foreign key constraint)
    await db.query(`DELETE FROM project_assignments WHERE project_id = $1`, [id]);
    await db.query(`DELETE FROM project_milestones WHERE project_id = $1`, [id]);
    await db.query(`DELETE FROM projects WHERE id = $1 RETURNING id`, [id]);
    
    res.json({ success: true });

  } catch (err) {
    console.error('DELETE project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// DELETE user from project assignment
router.delete('/:id/user/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    const userResult = await db.query(
      `SELECT user_id FROM users WHERE public_user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const internalUserId = userResult.rows[0].user_id;

    await db.query(
      `DELETE FROM project_assignments 
       WHERE project_id = $1 AND user_id = $2`,
      [id, internalUserId]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove user from project' });
  }
});

module.exports = router;