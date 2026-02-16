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
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.estimated_effort AS "estimatedEffort",
        p.created_at AS "createdAt",
        p.documents,
        p.timelines,
        p.task_id AS "taskId"
      FROM projects p
      JOIN tasks t ON p.task_id = t.task_id
      JOIN status s ON t.status_id = s.status_id
      JOIN priority pr ON t.priority_id = pr.priority_id
      ORDER BY p.created_at DESC
    `);

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
      priority,
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
      priority === "High" ? 3 : priority === "Medium" ? 2 : 1,
      new Date(),
      dueDate
    ]);

    const newTaskId = taskResult.rows[0].task_id;

    // Insert project WITH task link
    const projectResult = await db.query(
      `INSERT INTO projects
      (project_id, title, description, priority,
       due_date, estimated_effort, documents,
       timelines, task_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        'PRJ-' + Date.now(),
        title,
        description,
        priority,
        dueDate,
        estimatedEffort,
        JSON.stringify(documents),
        JSON.stringify(timelines),
        newTaskId
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
    
    // Handle empty or missing priority values
    const safePriority = priority && priority.trim() !== ''
      ? priority
      : 'Not set';
    
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

    // update project info
    const projectResult = await db.query(
      `UPDATE projects SET
        title=$1,
        description=$2,
        due_date=$3,
        estimated_effort=$4,
        documents=$5,
        timelines=$6
      WHERE id=$7
      RETURNING task_id`,
      [
        title,
        description,
        dueDate,
        estimatedEffort,
        JSON.stringify(documents),
        JSON.stringify(timelines),
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
        p.title,
        p.description,
        s.status_name AS "status",
        pr.priority_level AS "priority",
        p.due_date AS "dueDate",
        p.estimated_effort AS "estimatedEffort",
        p.created_at AS "createdAt",
        p.documents,
        p.timelines,
        p.task_id AS "taskId"
      FROM projects p
      JOIN tasks t ON p.task_id = t.task_id
      JOIN status s ON t.status_id = s.status_id
      JOIN priority pr ON t.priority_id = pr.priority_id
      WHERE p.id = $1
    `, [id]);

    res.json(updatedProject.rows[0]);

  } catch (err) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('PUT project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Start a transaction
    await db.query('BEGIN');

    // Get the task_id before deleting the project
    const projectResult = await db.query(
      `SELECT task_id FROM projects WHERE id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    const taskId = projectResult.rows[0].task_id;

    // Delete the project
    await db.query(
      `DELETE FROM projects WHERE id=$1`,
      [id]
    );

    // Delete the associated task
    await db.query(
      `DELETE FROM tasks WHERE task_id=$1`,
      [taskId]
    );

    // Commit the transaction
    await db.query('COMMIT');

    res.json({ success: true });
  } catch (err) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('DELETE project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;