const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /subjects
 * List the subject catalog for this institute.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at FROM subjects WHERE institute_id = $1 ORDER BY name`,
      [req.user.institute_id]
    );
    res.json({ subjects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching subjects' });
  }
});

/**
 * POST /subjects   (Admin only)
 * body: { name }
 */
router.post('/', requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO subjects (institute_id, name) VALUES ($1, $2) RETURNING id, name, created_at`,
      [req.user.institute_id, name]
    );
    res.status(201).json({ subject: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A subject with this name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the subject' });
  }
});

/**
 * DELETE /subjects/:id   (Admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM subjects WHERE id = $1 AND institute_id = $2 RETURNING id`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the subject' });
  }
});

/**
 * POST /subjects/:id/assign   (Admin only)
 * The core of Module 6: "create subject, assign teacher, assign batch."
 * body: { batchId, teacherId }
 * One subject can only have one teacher per batch (enforced by a unique
 * constraint) — assigning again just replaces the teacher for that batch.
 */
router.post('/:id/assign', requireRole('admin'), async (req, res) => {
  const { batchId, teacherId } = req.body;
  if (!batchId || !teacherId) {
    return res.status(400).json({ error: 'batchId and teacherId are required' });
  }

  try {
    // verify subject, batch, and teacher all belong to this institute
    const [subjectCheck, batchCheck, teacherCheck] = await Promise.all([
      pool.query(`SELECT id FROM subjects WHERE id = $1 AND institute_id = $2`, [req.params.id, req.user.institute_id]),
      pool.query(`SELECT id FROM batches WHERE id = $1 AND institute_id = $2`, [batchId, req.user.institute_id]),
      pool.query(`SELECT id FROM users WHERE id = $1 AND institute_id = $2 AND role = 'teacher'`, [teacherId, req.user.institute_id]),
    ]);
    if (subjectCheck.rowCount === 0) return res.status(404).json({ error: 'Subject not found' });
    if (batchCheck.rowCount === 0) return res.status(404).json({ error: 'Batch not found' });
    if (teacherCheck.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });

    const result = await pool.query(
      `INSERT INTO batch_subject_teacher (institute_id, batch_id, subject_id, teacher_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (batch_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
       RETURNING id, batch_id, subject_id, teacher_id`,
      [req.user.institute_id, batchId, req.params.id, teacherId]
    );
    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong assigning the subject' });
  }
});

/**
 * DELETE /subjects/assignments/:assignmentId   (Admin only)
 * Removes a single batch+subject+teacher assignment (not the subject itself).
 */
router.delete('/assignments/:assignmentId', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM batch_subject_teacher WHERE id = $1 AND institute_id = $2 RETURNING id`,
      [req.params.assignmentId, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong removing the assignment' });
  }
});

module.exports = router;
