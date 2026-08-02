/**
 * Seeds a demo institution with rich fake data for testing.
 *
 * Creates: 1 institute, 1 admin, 3 teachers, 3 batches, 5 subjects,
 * 30 students, 2 parents, parent-student links, timetable slots,
 * attendance sessions with records, homework with statuses, exams with marks.
 *
 * Run with: npm run db:seed
 * To reset & re-seed: delete prisma/dev.db, run `npx prisma db push`, then `npm run db:seed`
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a date N days ago from today. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a 1970-01-01 DateTime for a given hour:minute (SQLite time storage). */
function timeSlot(hour: number, minute: number): Date {
  return new Date(`1970-01-01T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
}

// ── Data ───────────────────────────────────────────────────────────

const STUDENT_NAMES = [
  'Rohan Mehta', 'Ananya Sharma', 'Arjun Patel', 'Priya Reddy', 'Karan Gupta',
  'Sneha Verma', 'Aarav Joshi', 'Diya Iyer', 'Vikram Das', 'Meera Nair',
  'Raj Malhotra', 'Ishita Kapoor', 'Siddharth Roy', 'Neha Chauhan', 'Aditya Singh',
  'Kavya Mishra', 'Rahul Saxena', 'Pooja Bhat', 'Dev Kulkarni', 'Shruti Agrawal',
  'Manish Tiwari', 'Riya Jain', 'Varun Deshmukh', 'Anjali Pillai', 'Nikhil Banerjee',
  'Tanvi Khanna', 'Harsh Pandey', 'Swati Srivastava', 'Akash Menon', 'Divya Rao',
];

const TEACHER_DATA = [
  { name: 'Priya Singh', email: 'teacher@prabodha.local', qualification: 'M.Sc. Computer Science', exp: 5 },
  { name: 'Rajesh Kumar', email: 'rajesh.k@prabodha.local', qualification: 'M.A. Mathematics', exp: 8 },
  { name: 'Sunita Devi', email: 'sunita.d@prabodha.local', qualification: 'M.Sc. Physics', exp: 6 },
];

const BATCH_NAMES = ['Class XI CS', 'Class XI Commerce', 'Class XII Science'];
const SUBJECT_NAMES = ['Computer Science', 'Mathematics', 'Physics', 'English', 'Chemistry'];

const EXAM_NAMES = ['Unit Test 1', 'Mid-Term', 'Unit Test 2', 'Pre-Final', 'Final Exam'];

const HOMEWORK_TITLES = [
  'Chapter 3 Exercise', 'Lab Assignment #2', 'Practice Problems Set A',
  'Reading Comprehension', 'Project Proposal Draft', 'Worksheet: Functions',
  'Case Study Analysis', 'Numerical Problems', 'Essay: Technology Impact',
  'Revision Questions',
];

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding demo data...\n');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Institute ──
  const institute = await prisma.institute.upsert({
    where: { slug: 'demo-institution' },
    update: {},
    create: { name: 'Demo Institution', slug: 'demo-institution', academicYear: '2026-27' },
  });
  console.log('✓ Institute:', institute.name);

  // ── Admin ──
  const admin = await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'admin@prabodha.local' } },
    update: {},
    create: { instituteId: institute.id, role: 'admin', name: 'Ayush Kumar', email: 'admin@prabodha.local', passwordHash },
  });
  console.log('✓ Admin:', admin.email);

  // ── Teachers ──
  const teachers = [];
  for (const t of TEACHER_DATA) {
    const teacher = await prisma.user.upsert({
      where: { instituteId_email: { instituteId: institute.id, email: t.email } },
      update: {},
      create: {
        instituteId: institute.id, role: 'teacher', name: t.name, email: t.email,
        passwordHash, qualification: t.qualification, experienceYears: t.exp,
      },
    });
    teachers.push(teacher);
  }
  console.log(`✓ Teachers: ${teachers.length} created`);

  // ── Batches ──
  const batches = [];
  for (const name of BATCH_NAMES) {
    const batch = await prisma.batch.upsert({
      where: { instituteId_name: { instituteId: institute.id, name } },
      update: {},
      create: { instituteId: institute.id, name },
    });
    batches.push(batch);
  }
  console.log(`✓ Batches: ${batches.length} created`);

  // ── Subjects ──
  const subjects = [];
  for (const name of SUBJECT_NAMES) {
    const subject = await prisma.subject.upsert({
      where: { instituteId_name: { instituteId: institute.id, name } },
      update: {},
      create: { instituteId: institute.id, name },
    });
    subjects.push(subject);
  }
  console.log(`✓ Subjects: ${subjects.length} created`);

  // ── Students (10 per batch = 30 total) ──
  const allStudents: { id: string; name: string; batchId: string }[] = [];
  for (let bi = 0; bi < batches.length; bi++) {
    for (let si = 0; si < 10; si++) {
      const idx = bi * 10 + si;
      const name = STUDENT_NAMES[idx];
      const email = name.toLowerCase().replace(/\s+/g, '.') + '@prabodha.local';
      const student = await prisma.user.upsert({
        where: { instituteId_email: { instituteId: institute.id, email } },
        update: {},
        create: {
          instituteId: institute.id, role: 'student', name, email,
          passwordHash, batchId: batches[bi].id,
        },
      });
      allStudents.push({ id: student.id, name: student.name, batchId: batches[bi].id });
    }
  }
  console.log(`✓ Students: ${allStudents.length} created`);

  // ── BatchSubjectTeacher assignments ──
  // Each teacher gets assigned to ~2 subjects across batches
  const bstRecords: { id: string; batchId: string; subjectId: string; teacherId: string }[] = [];
  const assignments = [
    { batchIdx: 0, subjectIdx: 0, teacherIdx: 0 }, // XI CS - CS - Priya
    { batchIdx: 0, subjectIdx: 1, teacherIdx: 1 }, // XI CS - Math - Rajesh
    { batchIdx: 0, subjectIdx: 3, teacherIdx: 2 }, // XI CS - English - Sunita
    { batchIdx: 1, subjectIdx: 1, teacherIdx: 1 }, // XI Commerce - Math - Rajesh
    { batchIdx: 1, subjectIdx: 3, teacherIdx: 2 }, // XI Commerce - English - Sunita
    { batchIdx: 2, subjectIdx: 2, teacherIdx: 2 }, // XII Science - Physics - Sunita
    { batchIdx: 2, subjectIdx: 1, teacherIdx: 1 }, // XII Science - Math - Rajesh
    { batchIdx: 2, subjectIdx: 4, teacherIdx: 0 }, // XII Science - Chemistry - Priya
  ];

  for (const a of assignments) {
    const bst = await prisma.batchSubjectTeacher.upsert({
      where: { batchId_subjectId: { batchId: batches[a.batchIdx].id, subjectId: subjects[a.subjectIdx].id } },
      update: {},
      create: {
        instituteId: institute.id,
        batchId: batches[a.batchIdx].id,
        subjectId: subjects[a.subjectIdx].id,
        teacherId: teachers[a.teacherIdx].id,
      },
    });
    bstRecords.push({ id: bst.id, batchId: bst.batchId, subjectId: bst.subjectId, teacherId: bst.teacherId });
  }
  console.log(`✓ Assignments: ${bstRecords.length} (batch-subject-teacher)`);

  // ── Timetable Slots ──
  let slotCount = 0;
  for (const bst of bstRecords) {
    // 2-3 slots per week for each assignment
    const days = [1, 3, 5].slice(0, randomInt(2, 3)); // Mon, Wed, Fri
    for (const day of days) {
      const hour = randomInt(8, 14);
      try {
        await prisma.timetableSlot.create({
          data: {
            instituteId: institute.id,
            batchSubjectTeacherId: bst.id,
            dayOfWeek: day,
            startTime: timeSlot(hour, 0),
            endTime: timeSlot(hour + 1, 0),
            classroom: `Room ${randomInt(101, 310)}`,
          },
        });
        slotCount++;
      } catch { /* skip duplicates */ }
    }
  }
  console.log(`✓ Timetable: ${slotCount} slots`);

  // ── Attendance Sessions (last 20 days) ──
  let sessionCount = 0;
  let recordCount = 0;
  for (const bst of bstRecords) {
    const batchStudents = allStudents.filter((s) => s.batchId === bst.batchId);
    // Create attendance for ~15 of the last 20 days
    for (let d = 1; d <= 20; d += randomInt(1, 2)) {
      const sessionDate = daysAgo(d);
      try {
        const session = await prisma.attendanceSession.create({
          data: {
            instituteId: institute.id,
            batchSubjectTeacherId: bst.id,
            sessionDate,
            markedBy: bst.teacherId,
            records: {
              create: batchStudents.map((s) => ({
                studentId: s.id,
                status: Math.random() > 0.15 ? 'present' : 'absent', // ~85% attendance
              })),
            },
          },
        });
        sessionCount++;
        recordCount += batchStudents.length;
      } catch { /* skip duplicates (same bst+date) */ }
    }
  }
  console.log(`✓ Attendance: ${sessionCount} sessions, ${recordCount} records`);

  // ── Homework ──
  let hwCount = 0;
  for (const bst of bstRecords) {
    const batchStudents = allStudents.filter((s) => s.batchId === bst.batchId);
    // 2-3 homework per assignment
    for (let h = 0; h < randomInt(2, 3); h++) {
      const title = pickRandom(HOMEWORK_TITLES);
      const dueDate = daysAgo(-randomInt(1, 14)); // due in the future
      try {
        await prisma.homework.create({
          data: {
            instituteId: institute.id,
            batchId: bst.batchId,
            subjectId: bst.subjectId,
            assignedBy: bst.teacherId,
            title: `${title}`,
            description: `Complete ${title.toLowerCase()} for the upcoming class.`,
            dueDate,
            statuses: {
              create: batchStudents.map((s) => ({
                studentId: s.id,
                status: Math.random() > 0.4 ? 'completed' : 'pending', // ~60% completion
              })),
            },
          },
        });
        hwCount++;
      } catch { /* skip */ }
    }
  }
  console.log(`✓ Homework: ${hwCount} assignments`);

  // ── Exams & Marks ──
  let examCount = 0;
  let markCount = 0;
  for (const bst of bstRecords) {
    const batchStudents = allStudents.filter((s) => s.batchId === bst.batchId);
    // 2-3 exams per assignment
    const examSlice = EXAM_NAMES.slice(0, randomInt(2, 3));
    for (let ei = 0; ei < examSlice.length; ei++) {
      const maxMarks = pickRandom([50, 80, 100]);
      const examDate = daysAgo(randomInt(5, 60));
      try {
        await prisma.exam.create({
          data: {
            instituteId: institute.id,
            batchId: bst.batchId,
            subjectId: bst.subjectId,
            createdBy: bst.teacherId,
            name: examSlice[ei],
            examDate,
            maxMarks,
            marks: {
              create: batchStudents.map((s) => ({
                studentId: s.id,
                marksObtained: Math.round((randomInt(40, 100) / 100) * maxMarks * 10) / 10,
              })),
            },
          },
        });
        examCount++;
        markCount += batchStudents.length;
      } catch { /* skip */ }
    }
  }
  console.log(`✓ Exams: ${examCount} exams, ${markCount} marks`);

  // ── Parents + Links ──
  const parent1 = await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'parent@prabodha.local' } },
    update: {},
    create: { instituteId: institute.id, role: 'parent', name: 'Suresh Mehta', email: 'parent@prabodha.local', passwordHash },
  });

  const parent2 = await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'parent2@prabodha.local' } },
    update: {},
    create: { instituteId: institute.id, role: 'parent', name: 'Meena Sharma', email: 'parent2@prabodha.local', passwordHash },
  });

  // Link parent1 to first 2 students (Rohan, Ananya)
  for (const student of allStudents.slice(0, 2)) {
    try {
      await prisma.parentStudentLink.create({
        data: { instituteId: institute.id, parentId: parent1.id, studentId: student.id },
      });
    } catch { /* skip duplicates */ }
  }

  // Link parent2 to students 3 & 4 (Arjun, Priya)
  for (const student of allStudents.slice(2, 4)) {
    try {
      await prisma.parentStudentLink.create({
        data: { instituteId: institute.id, parentId: parent2.id, studentId: student.id },
      });
    } catch { /* skip duplicates */ }
  }
  console.log(`✓ Parents: 2 created, 4 links`);

  // ── Summary ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete! All passwords: password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin:    admin@prabodha.local');
  console.log('  Teacher:  teacher@prabodha.local');
  console.log('  Student:  rohan.mehta@prabodha.local');
  console.log('  Parent:   parent@prabodha.local  (linked to Rohan + Ananya)');
  console.log('  Parent2:  parent2@prabodha.local  (linked to Arjun + Priya)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
