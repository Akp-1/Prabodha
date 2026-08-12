const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/**
 * POST /attendance   (Teacher, or Admin correcting on a teacher's behalf)
 * One call marks a whole class at once — this is the "under a minute per
 * class" flow from the PRD, not one request per student.
 *
 * body: {
 *   batchId, subjectId, date ("2026-07-15"),
 *   records: [ { studentId, status: "present" | "absent" }, ... ]
 * }
 *
 * Submitting again for the same batch+subject+date UPDATES the existing
 * session instead of creating a duplicate (e.g. a teacher fixing a mistake
 * later the same day).
 */
router.post('/', requireRole('admin', 'teacher'), async (req, res) => {
  const { batchId, subjectId, date, records } = req.body;

  if (!batchId || !subjectId || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'batchId, subjectId, date and a non-empty records array are required' });
  }
  for (const r of records) {
    if (!r.studentId || !['present', 'absent'].includes(r.status)) {
      return res.status(400).json({ error: 'Each record needs studentId and status of "present" or "absent"' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bst = await client.query(
      `SELECT id, teacher_id FROM batch_subject_teacher WHERE batch_id = $1 AND subject_id = $2 AND institute_id = $3`,
      [batchId, subjectId, req.user.institute_id]
    );
    if (bst.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No teacher is assigned to this subject for this batch' });
    }
    const { id: bstId, teacher_id: teacherId } = bst.rows[0];

    // a teacher can only mark attendance for their own classes; admins can mark any
    if (req.user.role === 'teacher' && req.user.id !== teacherId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not the assigned teacher for this subject and batch' });
    }

    const sessionResult = await client.query(
      `INSERT INTO attendance_sessions (institute_id, batch_subject_teacher_id, session_date, marked_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (batch_subject_teacher_id, session_date)
       DO UPDATE SET marked_by = EXCLUDED.marked_by, submitted_at = now()
       RETURNING id`,
      [req.user.institute_id, bstId, date, req.user.id]
    );
    const sessionId = sessionResult.rows[0].id;

    // replace any existing records for this session, then insert the new set —
    // simplest way to make a re-submission fully overwrite the previous one
    await client.query(`DELETE FROM attendance_records WHERE session_id = $1`, [sessionId]);

    const values = [];
    const placeholders = records.map((r, i) => {
      values.push(sessionId, r.studentId, r.status);
      const base = i * 3;
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    });
    await client.query(
      `INSERT INTO attendance_records (session_id, student_id, status) VALUES ${placeholders.join(', ')}`,
      values
    );

    await client.query('COMMIT');
    res.status(201).json({ sessionId, date, recordCount: records.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong submitting attendance' });
  } finally {
    client.release();
  }
});

/**
 * GET /attendance?batchId=&subjectId=&date=
 * Admin/Teacher: view a specific session's records (all three params required).
 */
router.get('/', requireRole('admin', 'teacher'), async (req, res) => {
  const { batchId, subjectId, date } = req.query;
  if (!batchId || !subjectId || !date) {
    return res.status(400).json({ error: 'batchId, subjectId and date are required' });
  }

  try {
    const session = await pool.query(
      `SELECT s.id, s.session_date, s.submitted_at, u.name AS marked_by_name
       FROM attendance_sessions s
       JOIN batch_subject_teacher bst ON bst.id = s.batch_subject_teacher_id
       JOIN users u ON u.id = s.marked_by
       WHERE bst.batch_id = $1 AND bst.subject_id = $2 AND s.session_date = $3 AND s.institute_id = $4`,
      [batchId, subjectId, date, req.user.institute_id]
    );
    if (session.rowCount === 0) return res.json({ session: null, records: [] });

    const records = await pool.query(
      `SELECT r.student_id, u.name AS student_name, r.status
       FROM attendance_records r JOIN users u ON u.id = r.student_id
       WHERE r.session_id = $1 ORDER BY u.name`,
      [session.rows[0].id]
    );

    res.json({ session: session.rows[0], records: records.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching attendance' });
  }
});

/**
 * PUT /attendance/:sessionId   (Admin only)
 * Corrects records after the fact (per FR-08: "Admin shall be able to edit
 * attendance records" — students/parents remain view-only, enforced by
 * simply not exposing this route to those roles).
 * body: { records: [{ studentId, status }, ...] }
 */
router.put('/:sessionId', requireRole('admin'), async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'records must be a non-empty array' });
  }
  for (const r of records) {
    if (!r.studentId || !['present', 'absent'].includes(r.status)) {
      return res.status(400).json({ error: 'Each record needs studentId and status of "present" or "absent"' });
    }
  }

  try {
    const session = await pool.query(
      `SELECT id FROM attendance_sessions WHERE id = $1 AND institute_id = $2`,
      [req.params.sessionId, req.user.institute_id]
    );
    if (session.rowCount === 0) return res.status(404).json({ error: 'Attendance session not found' });

    for (const r of records) {
      await pool.query(
        `UPDATE attendance_records SET status = $1 WHERE session_id = $2 AND student_id = $3`,
        [r.status, req.params.sessionId, r.studentId]
      );
    }
    res.json({ message: 'Attendance updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating attendance' });
  }
});

/**
 * GET /attendance/student/:id
 * Full attendance history + percentage for one student.
 * Admin: any student. Teacher: only their own batches. Student: self only.
 * Parent: only a linked child.
 */
router.get('/student/:id', async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only view your own attendance' });
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

    const records = await pool.query(
      `SELECT s.session_date, sub.name AS subject_name, r.status
       FROM attendance_records r
       JOIN attendance_sessions s ON s.id = r.session_id
       JOIN batch_subject_teacher bst ON bst.id = s.batch_subject_teacher_id
       JOIN subjects sub ON sub.id = bst.subject_id
       WHERE r.student_id = $1
       ORDER BY s.session_date DESC`,
      [req.params.id]
    );

    const total = records.rowCount;
    const present = records.rows.filter(r => r.status === 'present').length;
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : null;

    res.json({ summary: { total, present, absent: total - present, percentage }, history: records.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching attendance history' });
  }
});

module.exports = router;
