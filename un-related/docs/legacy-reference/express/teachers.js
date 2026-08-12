const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Note: creating a teacher's login itself is POST /auth/create-user
// (role: "teacher") — this file manages the profile once the account exists.

/**
 * GET /teachers   (Admin only)
 * List every teacher at the institute.
 */
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, qualification, experience_years, is_active, created_at
       FROM users WHERE institute_id = $1 AND role = 'teacher' ORDER BY name`,
      [req.user.institute_id]
    );
    res.json({ teachers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching teachers' });
  }
});

/**
 * GET /teachers/:id
 * Full profile + their subject/batch assignments.
 * Admins can view any teacher; a teacher can view their own profile.
 */
router.get('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'You can only view your own profile' });
  }

  try {
    const teacherResult = await pool.query(
      `SELECT id, name, email, phone, qualification, experience_years, is_active, created_at
       FROM users WHERE id = $1 AND institute_id = $2 AND role = 'teacher'`,
      [req.params.id, req.user.institute_id]
    );
    if (teacherResult.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });

    const assignmentsResult = await pool.query(
      `SELECT bst.id AS assignment_id, b.id AS batch_id, b.name AS batch_name,
              s.id AS subject_id, s.name AS subject_name
       FROM batch_subject_teacher bst
       JOIN batches b ON b.id = bst.batch_id
       JOIN subjects s ON s.id = bst.subject_id
       WHERE bst.teacher_id = $1
       ORDER BY b.name, s.name`,
      [req.params.id]
    );

    res.json({ teacher: teacherResult.rows[0], assignments: assignmentsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching the teacher' });
  }
});

/**
 * PUT /teachers/:id   (Admin only)
 * Edits profile fields. To change subject/batch assignments, use
 * POST /subjects/:id/assign instead.
 * body: any of { name, phone, qualification, experienceYears, isActive }
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, phone, qualification, experienceYears, isActive } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         qualification = COALESCE($3, qualification),
         experience_years = COALESCE($4, experience_years),
         is_active = COALESCE($5, is_active)
       WHERE id = $6 AND institute_id = $7 AND role = 'teacher'
       RETURNING id, name, email, phone, qualification, experience_years, is_active`,
      [name, phone, qualification, experienceYears, isActive, req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ teacher: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the teacher' });
  }
});

/**
 * DELETE /teachers/:id   (Admin only)
 * Soft delete: sets is_active = false rather than removing the row, so
 * attendance/homework history they created stays intact. Use the query
 * param ?hard=true to actually delete the row (only if they have no history).
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (req.query.hard === 'true') {
      const result = await pool.query(
        `DELETE FROM users WHERE id = $1 AND institute_id = $2 AND role = 'teacher' RETURNING id`,
        [req.params.id, req.user.institute_id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });
      return res.json({ message: 'Teacher permanently deleted' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false WHERE id = $1 AND institute_id = $2 AND role = 'teacher' RETURNING id`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the teacher' });
  }
});

module.exports = router;
