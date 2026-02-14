const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/auth.middleware');

// GET all projects
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        project_id AS "projectId",
        title,
        description,
        priority,
        due_date AS "dueDate",
        estimated_effort AS "estimatedEffort",
        status,
        created_at AS "createdAt",
        documents,
        timelines
      FROM projects
      ORDER BY created_at DESC
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
      documents = [],
      timelines = []
    } = req.body;

    // Get the internal user ID from the authenticated user
    const internalUserId = req.user.userId;

    // Start a transaction
    await db.query('BEGIN');

    // Insert the project
    const projectResult = await db.query(
      `INSERT INTO projects
      (project_id, title, description, priority, due_date, estimated_effort, documents, timelines)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        'PRJ-' + Date.now(),
        title,
        description,
        priority,
        dueDate,
        estimatedEffort,
        JSON.stringify(documents),
        JSON.stringify(timelines)
      ]
    );

    // Create matching task
    await db.query(
      `INSERT INTO tasks
      (title, assigned_to_user_id, reported_by_user_id,
       status_id, priority_id, creation_date, due_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        title,
        internalUserId, // user creating project (from auth middleware)
        internalUserId,
        1, // default status = To Do
        priority === "High" ? 3 : priority === "Medium" ? 2 : 1,
        new Date(),
        dueDate
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
      dueDate,
      estimatedEffort,
      status,
      documents = [],
      timelines = []
    } = req.body;

    const result = await db.query(
      `UPDATE projects SET
        title=$1,
        description=$2,
        priority=$3,
        due_date=$4,
        estimated_effort=$5,
        status=$6,
        documents=$7,
        timelines=$8
      WHERE id=$9
      RETURNING *`,
      [
        title,
        description,
        priority,
        dueDate,
        estimatedEffort,
        status,
        JSON.stringify(documents),
        JSON.stringify(timelines),
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `DELETE FROM projects WHERE id=$1`,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;