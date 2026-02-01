const express = require('express');
const router = express.Router();
const db = require('../config/db');

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

// POST new project
router.post('/', async (req, res) => {
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

    const result = await db.query(
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

    res.json(result.rows[0]);
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