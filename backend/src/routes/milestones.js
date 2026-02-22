const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middleware/auth.middleware');

// GET milestones for a specific project - expects numeric project ID
router.get('/project/:projectId', async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await db.query(`
      SELECT
        m.milestone_id AS "id",
        m.title,
        m.description,
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        s.status_name AS "status",
        p.priority_level AS "priority"
      FROM project_milestones m
      JOIN status s ON m.status_id = s.status_id
      JOIN priority p ON m.priority_id = p.priority_id
      WHERE m.project_id = $1
      ORDER BY m.start_date ASC
    `, [projectId]);

    res.json(result.rows);
  } catch (err) {
    console.error('GET milestones error:', err);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// GET a single milestone by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        m.milestone_id AS "id",
        m.title,
        m.description,
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        s.status_name AS "status",
        p.priority_level AS "priority",
        m.project_id AS "projectId"
      FROM project_milestones m
      JOIN status s ON m.status_id = s.status_id
      JOIN priority p ON m.priority_id = p.priority_id
      WHERE m.milestone_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET milestone error:', err);
    res.status(500).json({ error: 'Failed to fetch milestone' });
  }
});

// POST new milestone
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      startDate,
      endDate,
      status,
      priority
    } = req.body;

    // Validate required fields
    if (!projectId || !title || !startDate || !endDate || !status || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get status_id from status name
    const statusResult = await db.query(
      `SELECT status_id FROM status WHERE status_name = $1`,
      [status]
    );

    if (statusResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Get priority_id from priority level
    const priorityResult = await db.query(
      `SELECT priority_id FROM priority WHERE priority_level = $1`,
      [priority]
    );

    if (priorityResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid priority value' });
    }

    // Insert the milestone and get the ID
    const inserted = await db.query(`
      INSERT INTO project_milestones
      (project_id, title, description,
       start_date, end_date,
       status_id, priority_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING milestone_id
    `, [
      projectId,  // directly using numeric projectId
      title,
      description || null,
      startDate,
      endDate,
      statusResult.rows[0].status_id,
      priorityResult.rows[0].priority_id
    ]);

    const milestoneId = inserted.rows[0].milestone_id;

    // Fetch the complete milestone data with joins
    const fullData = await db.query(`
      SELECT
        m.milestone_id AS "id",
        m.title,
        m.description,
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        s.status_name AS "status",
        p.priority_level AS "priority",
        m.project_id AS "projectId"
      FROM project_milestones m
      JOIN status s ON m.status_id = s.status_id
      JOIN priority p ON m.priority_id = p.priority_id
      WHERE m.milestone_id = $1
    `, [milestoneId]);

    res.status(201).json(fullData.rows[0]);
  } catch (err) {
    console.error('POST milestone error:', err);

    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    res.status(500).json({ error: 'Failed to create milestone' });
  }
});

// PUT update milestone
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      status,
      priority
    } = req.body;

    // Check if milestone exists
    const milestoneCheck = await db.query(
      `SELECT milestone_id FROM project_milestones WHERE milestone_id = $1`,
      [id]
    );

    if (milestoneCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Get status_id from status name if provided
    let statusId = null;
    if (status) {
      const statusResult = await db.query(
        `SELECT status_id FROM status WHERE status_name = $1`,
        [status]
      );
      if (statusResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      statusId = statusResult.rows[0].status_id;
    }

    // Get priority_id from priority level if provided
    let priorityId = null;
    if (priority) {
      const priorityResult = await db.query(
        `SELECT priority_id FROM priority WHERE priority_level = $1`,
        [priority]
      );
      if (priorityResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid priority value' });
      }
      priorityId = priorityResult.rows[0].priority_id;
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (startDate !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(startDate);
    }
    if (endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(endDate);
    }
    if (statusId !== null) {
      updates.push(`status_id = $${paramIndex++}`);
      values.push(statusId);
    }
    if (priorityId !== null) {
      updates.push(`priority_id = $${paramIndex++}`);
      values.push(priorityId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id); // Add id for WHERE clause

    // Execute the update query
    const updateQuery = `
      UPDATE project_milestones
      SET ${updates.join(', ')}
      WHERE milestone_id = $${paramIndex}
      RETURNING milestone_id
    `;
    
    await db.query(updateQuery, values);

    // Fetch the updated milestone with joins to return complete data
    const updated = await db.query(`
      SELECT
        m.milestone_id AS "id",
        m.title,
        m.description,
        m.start_date AS "startDate",
        m.end_date AS "endDate",
        s.status_name AS "status",
        p.priority_level AS "priority",
        m.project_id AS "projectId"
      FROM project_milestones m
      JOIN status s ON m.status_id = s.status_id
      JOIN priority p ON m.priority_id = p.priority_id
      WHERE m.milestone_id = $1
    `, [id]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Updated milestone not found' });
    }

    res.json(updated.rows[0]);

  } catch (err) {
    console.error('PUT milestone error:', err);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// DELETE milestone
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM project_milestones WHERE milestone_id = $1 RETURNING milestone_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json({ success: true, message: 'Milestone deleted successfully' });
  } catch (err) {
    console.error('DELETE milestone error:', err);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
});

// DELETE all milestones for a project
router.delete('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.query(
      `DELETE FROM project_milestones WHERE project_id = $1 RETURNING milestone_id`,
      [projectId]
    );

    res.json({ 
      success: true, 
      message: `${result.rows.length} milestones deleted successfully` 
    });
  } catch (err) {
    console.error('DELETE project milestones error:', err);
    res.status(500).json({ error: 'Failed to delete project milestones' });
  }
});

module.exports = router;