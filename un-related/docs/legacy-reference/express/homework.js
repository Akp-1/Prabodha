const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/storage');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

/**
 * GET /homework?batchId=&subjectId=
 * Auto-scoped: student sees only their own batch's homework, teacher/admin
 * can filter freely, parent must pass studentId to view their child's.
 */
router.get('/', async (req, res) => {
  try {
    let where = ['h.institute_id = $1'];
    let params = [req.user.institute_id];

    if (req.user.role === 'student') {
      const student = await pool.query(`SELECT batch_id FROM users WHERE id = $1`, [req.user.id]);
      if (!student.rows[0]?.batch_id) return res.json({ homework: [] });
      params.push(student.rows[0].batch_id);
      where.push(`h.batch_id = $${params.length}`);
    } else if (req.user.role === 'parent') {
      const { studentId } = req.query;
      if (!studentId) return res.status(400).json({ error: 'studentId is required' });
      const link = await pool.query(`SELECT 1 FROM parent_student_links WHERE parent_id = $1 AND student_id = $2`, [req.user.id, studentId]);
      if (link.rowCount === 0) return res.status(403).json({ error: 'You are not linked to this student' });
      const student = await pool.query(`SELECT batch_id FROM users WHERE id = $1`, [studentId]);
      if (!student.rows[0]?.batch_id) return res.json({ homework: [] });
      params.push(student.rows[0].batch_id);
      where.push(`h.batch_id = $${params.length}`);
    } else {
      if (req.query.batchId) { params.push(req.query.batchId); where.push(`h.batch_id = $${params.length}`); }
      if (req.query.subjectId) { params.push(req.query.subjectId); where.push(`h.subject_id = $${params.length}`); }
    }

    const result = await pool.query(
      `SELECT h.id, h.title, h.description, h.due_date, h.file_url, h.created_at,
              b.name AS batch_name, s.name AS subject_name, u.name AS assigned_by_name
       FROM homework h
       JOIN batches b ON b.id = h.batch_id
       JOIN subjects s ON s.id = h.subject_id
       JOIN users u ON u.id = h.assigned_by
       WHERE ${where.join(' AND ')}
       ORDER BY h.due_date DESC`,
      params
    );
    res.json({ homework: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching homework' });
  }
});

/**
 * POST /homework   (Teacher, Admin)
 * multipart/form-data, optional "file" field.
 * Fields: batchId, subjectId, title, description?, dueDate ("2026-07-20")
 * Creates a homework_status row (defaulting to "pending") for every
 * current student in the batch, so parents have something to monitor
 * from the moment it's assigned.
 */
router.post('/', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { batchId, subjectId, title, description, dueDate } = req.body;

  if (!batchId || !subjectId || !title || !dueDate) {
    return res.status(400).json({ error: 'batchId, subjectId, title and dueDate are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (req.user.role === 'teacher') {
      const check = await client.query(
        `SELECT 1 FROM batch_subject_teacher WHERE batch_id = $1 AND subject_id = $2 AND teacher_id = $3`,
        [batchId, subjectId, req.user.id]
      );
      if (check.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'You are not assigned to teach this subject for this batch' });
      }
    }

    let fileUrl = null, filePath = null;
    if (req.file) {
      const uploaded = await uploadFile({ instituteId: req.user.institute_id, folder: 'homework', file: req.file });
      fileUrl = uploaded.url;
      filePath = uploaded.path;
    }

    const hwResult = await client.query(
      `INSERT INTO homework (institute_id, batch_id, subject_id, assigned_by, title, description, due_date, file_url, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, description, due_date, file_url, created_at`,
      [req.user.institute_id, batchId, subjectId, req.user.id, title, description || null, dueDate, fileUrl, filePath]
    );
    const homeworkId = hwResult.rows[0].id;

    const students = await client.query(`SELECT id FROM users WHERE batch_id = $1 AND role = 'student'`, [batchId]);
    if (students.rowCount > 0) {
      const values = [];
      const placeholders = students.rows.map((s, i) => {
        values.push(homeworkId, s.id);
        return `($${i * 2 + 1}, $${i * 2 + 2})`;
      });
      await client.query(
        `INSERT INTO homework_status (homework_id, student_id) VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ homework: hwResult.rows[0], studentsNotified: students.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Something went wrong assigning homework' });
  } finally {
    client.release();
  }
});

/**
 * GET /homework/:id/status   (Teacher who assigned it, or Admin)
 * The per-student completion list — what a teacher works from to update status.
 */
router.get('/:id/status', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const hw = await pool.query(`SELECT assigned_by FROM homework WHERE id = $1 AND institute_id = $2`, [req.params.id, req.user.institute_id]);
    if (hw.rowCount === 0) return res.status(404).json({ error: 'Homework not found' });
    if (req.user.role === 'teacher' && hw.rows[0].assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only view status for homework you assigned' });
    }

    const result = await pool.query(
      `SELECT hs.student_id, u.name AS student_name, hs.status, hs.updated_at
       FROM homework_status hs JOIN users u ON u.id = hs.student_id
       WHERE hs.homework_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ status: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching homework status' });
  }
});

/**
 * PUT /homework/:id/status   (Teacher who assigned it, or Admin)
 * body: { studentId, status: "pending" | "completed" }
 */
router.put('/:id/status', requireRole('admin', 'teacher'), async (req, res) => {
  const { studentId, status } = req.body;
  if (!studentId || !['pending', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'studentId and a status of "pending" or "completed" are required' });
  }

  try {
    const hw = await pool.query(`SELECT assigned_by FROM homework WHERE id = $1 AND institute_id = $2`, [req.params.id, req.user.institute_id]);
    if (hw.rowCount === 0) return res.status(404).json({ error: 'Homework not found' });
    if (req.user.role === 'teacher' && hw.rows[0].assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only update status for homework you assigned' });
    }

    const result = await pool.query(
      `UPDATE homework_status SET status = $1, updated_at = now()
       WHERE homework_id = $2 AND student_id = $3
       RETURNING student_id, status, updated_at`,
      [status, req.params.id, studentId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'No status record for this student on this homework' });
    res.json({ status: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating homework status' });
  }
});

/**
 * DELETE /homework/:id   (Admin, or the Teacher who assigned it)
 */
router.delete('/:id', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const existing = await pool.query(`SELECT file_path, assigned_by FROM homework WHERE id = $1 AND institute_id = $2`, [req.params.id, req.user.institute_id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Homework not found' });
    if (req.user.role === 'teacher' && existing.rows[0].assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete homework you assigned' });
    }

    if (existing.rows[0].file_path) {
      try { await deleteFile(existing.rows[0].file_path); } catch (e) { console.error('Storage delete failed (continuing):', e.message); }
    }

    await pool.query(`DELETE FROM homework WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Homework deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting homework' });
  }
});

module.exports = router;
