const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * GET /timetable
 * Scoped automatically by role:
 *   - admin:   ?batchId=  or  ?teacherId=  (optional; omit for everything)
 *   - teacher: always just their own schedule
 *   - student: always just their own batch's schedule
 *   - parent:  ?studentId= required, must be a linked child
 */
router.get('/', async (req, res) => {
  try {
    let where = ['ts.institute_id = $1'];
    let params = [req.user.institute_id];

    if (req.user.role === 'teacher') {
      params.push(req.user.id);
      where.push(`bst.teacher_id = $${params.length}`);
    } else if (req.user.role === 'student') {
      const student = await pool.query(`SELECT batch_id FROM users WHERE id = $1`, [req.user.id]);
      if (!student.rows[0]?.batch_id) return res.json({ timetable: [] });
      params.push(student.rows[0].batch_id);
      where.push(`bst.batch_id = $${params.length}`);
    } else if (req.user.role === 'parent') {
      const { studentId } = req.query;
      if (!studentId) return res.status(400).json({ error: 'studentId is required' });
      const link = await pool.query(
        `SELECT 1 FROM parent_student_links WHERE parent_id = $1 AND student_id = $2`,
        [req.user.id, studentId]
      );
      if (link.rowCount === 0) return res.status(403).json({ error: 'You are not linked to this student' });
      const student = await pool.query(`SELECT batch_id FROM users WHERE id = $1`, [studentId]);
      if (!student.rows[0]?.batch_id) return res.json({ timetable: [] });
      params.push(student.rows[0].batch_id);
      where.push(`bst.batch_id = $${params.length}`);
    } else if (req.user.role === 'admin') {
      if (req.query.batchId) { params.push(req.query.batchId); where.push(`bst.batch_id = $${params.length}`); }
      if (req.query.teacherId) { params.push(req.query.teacherId); where.push(`bst.teacher_id = $${params.length}`); }
    }

    const result = await pool.query(
      `SELECT ts.id, ts.day_of_week, ts.start_time, ts.end_time, ts.classroom,
              b.id AS batch_id, b.name AS batch_name,
              s.id AS subject_id, s.name AS subject_name,
              t.id AS teacher_id, t.name AS teacher_name
       FROM timetable_slots ts
       JOIN batch_subject_teacher bst ON bst.id = ts.batch_subject_teacher_id
       JOIN batches b ON b.id = bst.batch_id
       JOIN subjects s ON s.id = bst.subject_id
       JOIN users t ON t.id = bst.teacher_id
       WHERE ${where.join(' AND ')}
       ORDER BY ts.day_of_week, ts.start_time`,
      params
    );

    const timetable = result.rows.map(r => ({ ...r, day_name: DAY_NAMES[r.day_of_week] }));
    res.json({ timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching the timetable' });
  }
});

/**
 * POST /timetable   (Admin only)
 * body: { batchId, subjectId, dayOfWeek (0-6), startTime ("09:00"), endTime ("10:00"), classroom? }
 * batchId + subjectId must already have a teacher assigned via
 * POST /subjects/:id/assign (Module 6) — that's how we know who's teaching it.
 */
router.post('/', requireRole('admin'), async (req, res) => {
  const { batchId, subjectId, dayOfWeek, startTime, endTime, classroom } = req.body;

  if (!batchId || !subjectId || dayOfWeek === undefined || !startTime || !endTime) {
    return res.status(400).json({ error: 'batchId, subjectId, dayOfWeek, startTime and endTime are required' });
  }
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: 'dayOfWeek must be 0 (Sunday) through 6 (Saturday)' });
  }
  if (startTime >= endTime) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  try {
    const bst = await pool.query(
      `SELECT id, teacher_id FROM batch_subject_teacher WHERE batch_id = $1 AND subject_id = $2 AND institute_id = $3`,
      [batchId, subjectId, req.user.institute_id]
    );
    if (bst.rowCount === 0) {
      return res.status(404).json({ error: 'No teacher is assigned to this subject for this batch yet — assign one first via /subjects/:id/assign' });
    }
    const { id: bstId, teacher_id: teacherId } = bst.rows[0];

    // prevent the same teacher being double-booked at an overlapping time on the same day
    const clash = await pool.query(
      `SELECT ts.id FROM timetable_slots ts
       JOIN batch_subject_teacher b ON b.id = ts.batch_subject_teacher_id
       WHERE b.teacher_id = $1 AND ts.day_of_week = $2
         AND ts.start_time < $3 AND ts.end_time > $4`,
      [teacherId, dayOfWeek, endTime, startTime]
    );
    if (clash.rowCount > 0) {
      return res.status(409).json({ error: 'This teacher already has a class that overlaps with this time slot' });
    }

    const result = await pool.query(
      `INSERT INTO timetable_slots (institute_id, batch_subject_teacher_id, day_of_week, start_time, end_time, classroom)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, day_of_week, start_time, end_time, classroom`,
      [req.user.institute_id, bstId, dayOfWeek, startTime, endTime, classroom || null]
    );
    res.status(201).json({ slot: { ...result.rows[0], day_name: DAY_NAMES[dayOfWeek] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating the timetable slot' });
  }
});

/**
 * PUT /timetable/:id   (Admin only)
 * body: any of { dayOfWeek, startTime, endTime, classroom }
 */
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { dayOfWeek, startTime, endTime, classroom } = req.body;

  try {
    const result = await pool.query(
      `UPDATE timetable_slots SET
         day_of_week = COALESCE($1, day_of_week),
         start_time = COALESCE($2, start_time),
         end_time = COALESCE($3, end_time),
         classroom = COALESCE($4, classroom)
       WHERE id = $5 AND institute_id = $6
       RETURNING id, day_of_week, start_time, end_time, classroom`,
      [dayOfWeek, startTime, endTime, classroom, req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Timetable slot not found' });
    res.json({ slot: { ...result.rows[0], day_name: DAY_NAMES[result.rows[0].day_of_week] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong updating the timetable slot' });
  }
});

/**
 * DELETE /timetable/:id   (Admin only)
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM timetable_slots WHERE id = $1 AND institute_id = $2 RETURNING id`,
      [req.params.id, req.user.institute_id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Timetable slot not found' });
    res.json({ message: 'Timetable slot deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting the timetable slot' });
  }
});

module.exports = router;
