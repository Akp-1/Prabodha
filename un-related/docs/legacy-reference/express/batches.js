const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes here require login; mutations are admin-only, reads are open
// to any logged-in role at the institute (teachers/students need to see
// batch names too).
router.use(requireAuth);

/**
 * GET /batches
 * List every batch at the current institute, with a student count.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.name, b.created_at,
              COUNT(u.id) FILTER (WHERE u.role = 'student') AS student_count
       FROM batches b
       LEFT JOIN users u ON u.batch_id = b.id
       WHERE b.institute_id = $1
       GROUP BY b.id
       ORDER BY b.name`,
      [req.user.institute_id]
    );
    res.json({ batches: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching batches' });
  }
});

/**
 * GET /batches/:id
 * Full detail for one batch: its students and its subject/teacher assignments.
 */
router.get('/:id', async (req, res) => {
  try {
    const batchResult = await pool.query(
      `SELECT id, name, created_at FROM batches WHERE id = $1 AND institute_id = $2`,
      [req.params.id, req.user.institute_id]
    );
    if (batchResult.rowCount === 0) return res.status(404).json({ error: 'Batch not found' });

    const studentsResult = await pool.query(
      `SELECT id, name, email FROM users WHERE batch_id = $1 AND role = 'student' ORDER BY name`,
      [req.params.id]
    );

    const subjectsResult = await pool.query(
      `SELECT bst.id AS assignment_id, s.id AS subject_id, s.name AS subject_name,
              t.id AS teacher_id, t.name AS teacher_name
       FROM batch_subject_teacher bst
       JOIN subjects s ON s.id = bst.subject_id
       JOIN users t ON t.id = bst.teacher_id
       WHERE bst.batch_id = $1
       ORDER BY s.name`,
      [req.params.id]
    );

    res.json({
      batch: batchResult.rows[0],
      students: studentsResult.rows,
      subjects: subjectsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching the batch' });
  }
});

/**
 * POST /batches   (Admin only)
 * body: { name }
 */
router.post('/', requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO batches (institute_id, name) VALUES ($1, $2) RETURNING id, name, created_at`,
      [req.user.institute_id, name]
    );
    res.status(201).json({ batch: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A batch with this name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the batch' });
  }
});

/**
 * PUT /batches/:id   (Admin only)
 * body: { name }
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const result = await pool.query(
      `UPDATE batches SET name = $1 WHERE id = $2 AND institute_id = $3 RETURNING id, name, created_at`,
      [name, req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json({ batch: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A batch with this name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the batch' });
  }
});

/**
 * DELETE /batches/:id   (Admin only)
 * Students in this batch are NOT deleted — their batch_id just becomes NULL
 * (see the ON DELETE SET NULL in the schema), so no student data is lost.
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM batches WHERE id = $1 AND institute_id = $2 RETURNING id`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Batch not found' });
    res.json({ message: 'Batch deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the batch' });
  }
});

/**
 * POST /batches/:id/students   (Admin only)
 * Assign one or more existing students into this batch.
 * body: { studentIds: ["uuid", "uuid", ...] }
 */
router.post('/:id/students', requireRole('admin'), async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds must be a non-empty array' });
  }

  try {
    const batchCheck = await pool.query(
      `SELECT id FROM batches WHERE id = $1 AND institute_id = $2`,
      [req.params.id, req.user.institute_id]
    );
    if (batchCheck.rowCount === 0) return res.status(404).json({ error: 'Batch not found' });

    const result = await pool.query(
      `UPDATE users SET batch_id = $1
       WHERE id = ANY($2::uuid[]) AND institute_id = $3 AND role = 'student'
       RETURNING id, name, email`,
      [req.params.id, studentIds, req.user.institute_id]
    );
    res.json({ assigned: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong assigning students' });
  }
});

module.exports = router;
