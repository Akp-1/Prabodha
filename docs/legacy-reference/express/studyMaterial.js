const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/storage');

const router = express.Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB cap

/**
 * GET /study-material?batchId=&subjectId=
 * Any logged-in role. Teacher/admin see everything for the institute;
 * student/parent should pass batchId (their own batch) to keep results relevant
 * — access itself isn't restricted further since materials aren't sensitive
 * the way attendance/marks are, but you could tighten this later if needed.
 */
router.get('/', async (req, res) => {
  const { batchId, subjectId } = req.query;
  try {
    let where = ['sm.institute_id = $1'];
    let params = [req.user.institute_id];
    if (batchId) { params.push(batchId); where.push(`sm.batch_id = $${params.length}`); }
    if (subjectId) { params.push(subjectId); where.push(`sm.subject_id = $${params.length}`); }

    const result = await pool.query(
      `SELECT sm.id, sm.title, sm.description, sm.material_type, sm.file_url, sm.external_link, sm.created_at,
              b.name AS batch_name, s.name AS subject_name, u.name AS uploaded_by_name
       FROM study_materials sm
       JOIN batches b ON b.id = sm.batch_id
       JOIN subjects s ON s.id = sm.subject_id
       JOIN users u ON u.id = sm.uploaded_by
       WHERE ${where.join(' AND ')}
       ORDER BY sm.created_at DESC`,
      params
    );
    res.json({ materials: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching study material' });
  }
});

/**
 * POST /study-material   (Teacher, Admin)
 * multipart/form-data with a "file" field for pdf/image/note uploads, OR
 * JSON body with materialType "link" and externalLink for links.
 * Other fields (form or JSON): batchId, subjectId, title, description?, materialType
 */
router.post('/', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { batchId, subjectId, title, description, materialType, externalLink } = req.body;

  if (!batchId || !subjectId || !title || !materialType) {
    return res.status(400).json({ error: 'batchId, subjectId, title and materialType are required' });
  }
  if (!['pdf', 'image', 'note', 'link'].includes(materialType)) {
    return res.status(400).json({ error: 'materialType must be one of: pdf, image, note, link' });
  }
  if (materialType === 'link' && !externalLink) {
    return res.status(400).json({ error: 'externalLink is required when materialType is "link"' });
  }
  if (materialType !== 'link' && !req.file) {
    return res.status(400).json({ error: 'A file upload is required when materialType is not "link"' });
  }

  try {
    // teachers may only upload to a batch+subject they're actually assigned to
    if (req.user.role === 'teacher') {
      const check = await pool.query(
        `SELECT 1 FROM batch_subject_teacher WHERE batch_id = $1 AND subject_id = $2 AND teacher_id = $3`,
        [batchId, subjectId, req.user.id]
      );
      if (check.rowCount === 0) {
        return res.status(403).json({ error: 'You are not assigned to teach this subject for this batch' });
      }
    }

    let fileUrl = null, filePath = null;
    if (req.file) {
      const uploaded = await uploadFile({ instituteId: req.user.institute_id, folder: 'study-material', file: req.file });
      fileUrl = uploaded.url;
      filePath = uploaded.path;
    }

    const result = await pool.query(
      `INSERT INTO study_materials (institute_id, batch_id, subject_id, uploaded_by, title, description, material_type, file_url, file_path, external_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, title, description, material_type, file_url, external_link, created_at`,
      [req.user.institute_id, batchId, subjectId, req.user.id, title, description || null, materialType, fileUrl, filePath, externalLink || null]
    );
    res.status(201).json({ material: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong uploading study material' });
  }
});

/**
 * DELETE /study-material/:id   (Admin, or the Teacher who uploaded it)
 */
router.delete('/:id', requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT file_path, uploaded_by FROM study_materials WHERE id = $1 AND institute_id = $2`,
      [req.params.id, req.user.institute_id]
    );
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Study material not found' });
    if (req.user.role === 'teacher' && existing.rows[0].uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete material you uploaded' });
    }

    if (existing.rows[0].file_path) {
      try { await deleteFile(existing.rows[0].file_path); } catch (e) { console.error('Storage delete failed (continuing):', e.message); }
    }

    await pool.query(`DELETE FROM study_materials WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Study material deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong deleting study material' });
  }
});

module.exports = router;
