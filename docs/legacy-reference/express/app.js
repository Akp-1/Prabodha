const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const batchRoutes = require('./routes/batches');
const subjectRoutes = require('./routes/subjects');
const timetableRoutes = require('./routes/timetable');
const attendanceRoutes = require('./routes/attendance');
const studyMaterialRoutes = require('./routes/studyMaterial');
const homeworkRoutes = require('./routes/homework');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'prabodha-api',
    modules: ['auth', 'teachers', 'students', 'batches', 'subjects', 'timetable', 'attendance', 'study-material', 'homework'],
  });
});

app.use('/auth', authRoutes);
app.use('/teachers', teacherRoutes);
app.use('/students', studentRoutes);
app.use('/batches', batchRoutes);
app.use('/subjects', subjectRoutes);
app.use('/timetable', timetableRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/study-material', studyMaterialRoutes);
app.use('/homework', homeworkRoutes);

// multer errors (e.g. file too large) land here rather than the generic 404/500 handlers
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

// catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = app;
