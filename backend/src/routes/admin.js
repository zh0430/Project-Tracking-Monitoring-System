const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticate = require("../middleware/auth.middleware");
const authorizeAdmin = require("../middleware/admin.middleware");
const { resetUserPassword } = require("../controllers/admin.controller");

// Get current admin profile
router.get(
  "/me",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT u.public_user_id, u.name, u.email 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1
         AND r.role_name = 'admin'`,
        [req.user.userId]
      );

      const admin = result.rows[0];

      if (!admin) {
        return res.status(404).json({
          message: "Admin not found",
        });
      }

      res.json({
        adminID: admin.public_user_id,
        name: admin.name,
        email: admin.email,
      });
    } catch (err) {
      console.error("Admin /me error:", err);
      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// Get all employees (users) - excluding admin users
router.get(
  "/employees",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          u.public_user_id AS "userID",
          u.role_id AS "roleID",
          u.name,
          u.email
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name != 'admin'
      `);

      res.json(result.rows);
    } catch (err) {
      console.error("Admin /employees error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all roles
router.get(
  "/roles",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          role_id AS "roleID",
          role_name AS "roleName"
        FROM roles
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Admin /roles error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Reset user password (admin only)
router.post(
  "/users/:id/reset-password",
  authenticate,
  authorizeAdmin,
  resetUserPassword
);

// Get all tasks (admin only) with user details
router.get("/tasks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.task_id AS "taskID",
        t.title,
        u.public_user_id AS "assignedToUserID",
        r.public_user_id AS "reportedByUserID",
        t.status_id AS "statusID",
        t.priority_id AS "priorityID",
        t.creation_date AS "createdDate",
        t.due_date AS "dueDate",
        t.completion_date AS "completedDate"
      FROM tasks t
      JOIN users u ON t.assigned_to_user_id = u.user_id
      JOIN users r ON t.reported_by_user_id = r.user_id
      ORDER BY t.creation_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Admin /tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all statuses (admin only)
router.get("/statuses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status_id AS "statusID",
        status_name AS "statusName"
      FROM status
      ORDER BY status_id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Admin /statuses error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all priorities (admin only)
router.get("/priorities", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        priority_id AS "priorityID",
        priority_level AS "priorityLevel"
      FROM priority
      ORDER BY priority_id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Admin /priorities error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all projects (admin only) with user details and timelines
router.get("/projects", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        (
          SELECT COALESCE(json_agg(u.public_user_id), '[]')
          FROM project_assignments pa
          JOIN users u ON pa.user_id = u.user_id
          WHERE pa.project_id = p.id
        ) AS "assignedToUserIDs",
        p.title,
        p.description,
        p.status_id AS "statusID",
        s.status_name AS "status",
        p.priority_id AS "priorityID",
        pr.priority_level AS "priority",
        p.created_at AS "createdDate",
        p.due_date AS "dueDate",
        p.approval_status AS "approvalStatus",
        COALESCE(p.documents, '[]') AS documents,
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
      ORDER BY p.created_at DESC
    `);

    result.rows.forEach(project => {
      if (typeof project.documents === "string") {
        project.documents = JSON.parse(project.documents);
      }
      
      // Transform document URLs to use server uploads folder
      project.documents = project.documents.map(doc => ({
        ...doc,
        fileData: doc.fileData?.startsWith('http')
          ? doc.fileData
          : `http://localhost:5000/uploads/${doc.fileStoreName}`
      }));

      if (typeof project.timelines === "string") {
        project.timelines = JSON.parse(project.timelines);
      }
    });

    res.json(result.rows);

  } catch (err) {
    console.error("Admin /projects error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get projects assigned to a specific user (admin only) with timelines
router.get("/projects/user/:userId", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(`
      SELECT
        p.id,
        p.project_id AS "projectId",
        (
          SELECT COALESCE(json_agg(u.public_user_id), '[]')
          FROM project_assignments pa
          JOIN users u ON pa.user_id = u.user_id
          WHERE pa.project_id = p.id
        ) AS "assignedToUserIDs",
        p.title,
        p.description,
        p.status_id AS "statusID",
        s.status_name AS "status",
        p.priority_id AS "priorityID",
        pr.priority_level AS "priority",
        p.created_at AS "createdDate",
        p.due_date AS "dueDate",
        p.approval_status AS "approvalStatus",
        COALESCE(p.documents, '[]') AS documents,
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
        JOIN users u ON pa.user_id = u.user_id
        WHERE pa.project_id = p.id AND u.public_user_id = $1
      )
      ORDER BY p.created_at DESC
    `, [userId]);

    result.rows.forEach(project => {
      if (typeof project.documents === "string") {
        project.documents = JSON.parse(project.documents);
      }
      
      // Transform document URLs to use server uploads folder
      project.documents = project.documents.map(doc => ({
        ...doc,
        fileData: doc.fileData?.startsWith('http')
          ? doc.fileData
          : `http://localhost:5000/uploads/${doc.fileStoreName}`
      }));

      if (typeof project.timelines === "string") {
        project.timelines = JSON.parse(project.timelines);
      }
    });

    res.json(result.rows);

  } catch (err) {
    console.error("Admin /projects/user error:", err);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

// Get notifications (placeholder)
router.get("/notifications", authenticate, authorizeAdmin, (req, res) => res.json([]));

module.exports = router;