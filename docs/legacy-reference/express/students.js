const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Note: creating a student's login itself is POST /auth/create-user
// (role: "student") — this file manages the profile once the account exists.

/**
 * GET /students   (Admin and Teacher)
 * Teachers only see students in batches they actually teach.
 * Optional ?batchId=... to filter.
 */
router.get('/', requireRole('admin', 'teacher'), async (req, res) => {
  const { batchId } = req.query;

  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `SELECT u.id, u.name, u.email, u.phone, u.date_of_birth, u.parent_name,
                       u.enrollment_date, u.is_active, b.id AS batch_id, b.name AS batch_name
                FROM users u LEFT JOIN batches b ON b.id = u.batch_id
                WHERE u.institute_id = $1 AND u.role = 'student'
                ${batchId ? 'AND u.batch_id = $2' : ''}
                ORDER BY u.name`;
      params = batchId ? [req.user.institute_id, batchId] : [req.user.institute_id];
    } else {
      // teacher: only students in batches this teacher is assigned to
      query = `SELECT DISTINCT u.id, u.name, u.email, u.phone, b.id AS batch_id, b.name AS batch_name
                FROM users u
                JOIN batches b ON b.id = u.batch_id
                JOIN batch_subject_teacher bst ON bst.batch_id = b.id
                WHERE u.institute_id = $1 AND u.role = 'student' AND bst.teacher_id = $2
                ${batchId ? 'AND u.batch_id = $3' : ''}
                ORDER BY u.name`;
      params = batchId ? [req.user.institute_id, req.user.id, batchId] : [req.user.institute_id, req.user.id];
    }

    const result = await pool.query(query, params);
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching students' });
  }
});

/**
 * GET /students/:id
 * Admin: any student. Teacher: only their own batch's students.
 * Student: only themselves. Parent: only their linked child/children.
 */
router.get('/:id', async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only view your own profile' });
    }
    if (req.user.role === 'parent') {
      const link = await pool.query(
        `SELECT 1 FROM parent_student_links WHERE parent_id = $1 AND student_id = $2`,
        [req.user.id, req.params.id]
      );
      if (link.rowCount === 0) return res.status(403).json({ error: 'You are not linked to this student' });
    }
    if (req.user.role === 'teacher') {
      const taught = await pool.query(
        `SELECT 1 FROM users u
         JOIN batch_subject_teacher bst ON bst.batch_id = u.batch_id
         WHERE u.id = $1 AND bst.teacher_id = $2`,
        [req.params.id, req.user.id]
      );
      if (taught.rowCount === 0) return res.status(403).json({ error: 'This student is not in one of your batches' });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.date_of_birth, u.address, u.parent_name,
              u.enrollment_date, u.is_active, b.id AS batch_id, b.name AS batch_name
       FROM users u LEFT JOIN batches b ON b.id = u.batch_id
       WHERE u.id = $1 AND u.institute_id = $2 AND u.role = 'student'`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching the student' });
  }
});

/**
 * PUT /students/:id   (Admin only)
 * body: any of { name, phone, batchId, dateOfBirth, address, parentName }
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, phone, batchId, dateOfBirth, address, parentName } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         batch_id = COALESCE($3, batch_id),
         date_of_birth = COALESCE($4, date_of_birth),
         address = COALESCE($5, address),
         parent_name = COALESCE($6, parent_name)
       WHERE id = $7 AND institute_id = $8 AND role = 'student'
       RETURNING id, name, email, phone, batch_id, date_of_birth, address, parent_name`,
      [name, phone, batchId, dateOfBirth, address, parentName, req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the student' });
  }
});

/**
 * DELETE /students/:id   (Admin only)
 * Soft delete by default (keeps attendance/homework history intact).
 * ?hard=true permanently removes the row.
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    if (req.query.hard === 'true') {
      const result = await pool.query(
        `DELETE FROM users WHERE id = $1 AND institute_id = $2 AND role = 'student' RETURNING id`,
        [req.params.id, req.user.institute_id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
      return res.json({ message: 'Student permanently deleted' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false WHERE id = $1 AND institute_id = $2 AND role = 'student' RETURNING id`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the student' });
  }
});

/**
 * POST /students/:id/link-parent   (Admin only)
 * Links an existing parent account to this student, so that parent can
 * view the student's attendance/homework/progress.
 * body: { parentId }
 */
router.post('/:id/link-parent', requireRole('admin'), async (req, res) => {
  const { parentId } = req.body;
  if (!parentId) return res.status(400).json({ error: 'parentId is required' });

  try {
    const [studentCheck, parentCheck] = await Promise.all([
      pool.query(`SELECT id FROM users WHERE id = $1 AND institute_id = $2 AND role = 'student'`, [req.params.id, req.user.institute_id]),
      pool.query(`SELECT id FROM users WHERE id = $1 AND institute_id = $2 AND role = 'parent'`, [parentId, req.user.institute_id]),
    ]);
    if (studentCheck.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    if (parentCheck.rowCount === 0) return res.status(404).json({ error: 'Parent not found' });

    const result = await pool.query(
      `INSERT INTO parent_student_links (institute_id, parent_id, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (parent_id, student_id) DO NOTHING
       RETURNING id`,
      [req.user.institute_id, parentId, req.params.id]
    );
    res.status(201).json({ message: 'Parent linked to student', linked: result.rowCount > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong linking the parent' });
  }
});

module.exports = router;
