/**
 * Seeds a demo institution so you have something to look at immediately after
 * `npm run db:migrate`, without manually calling the register-institute API.
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const institute = await prisma.institute.upsert({
    where: { slug: 'demo-institution' },
    update: {},
    create: {
      name: 'Demo Institution',
      slug: 'demo-institution',
      academicYear: '2026-27',
    },
  });

  const admin = await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'admin@prabodha.local' } },
    update: {},
    create: {
      instituteId: institute.id,
      role: 'admin',
      name: 'Ayush Kumar',
      email: 'admin@prabodha.local',
      passwordHash,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'teacher@prabodha.local' } },
    update: {},
    create: {
      instituteId: institute.id,
      role: 'teacher',
      name: 'Priya Singh',
      email: 'teacher@prabodha.local',
      passwordHash,
      qualification: 'M.Sc. Computer Science',
    },
  });

  const batch = await prisma.batch.upsert({
    where: { instituteId_name: { instituteId: institute.id, name: 'Class XI CS' } },
    update: {},
    create: { instituteId: institute.id, name: 'Class XI CS' },
  });

  const subject = await prisma.subject.upsert({
    where: { instituteId_name: { instituteId: institute.id, name: 'Computer Science' } },
    update: {},
    create: { instituteId: institute.id, name: 'Computer Science' },
  });

  await prisma.batchSubjectTeacher.upsert({
    where: { batchId_subjectId: { batchId: batch.id, subjectId: subject.id } },
    update: {},
    create: { instituteId: institute.id, batchId: batch.id, subjectId: subject.id, teacherId: teacher.id },
  });

  await prisma.user.upsert({
    where: { instituteId_email: { instituteId: institute.id, email: 'student@prabodha.local' } },
    update: {},
    create: {
      instituteId: institute.id,
      role: 'student',
      name: 'Rohan Mehta',
      email: 'student@prabodha.local',
      passwordHash,
      batchId: batch.id,
    },
  });

  console.log('Seeded institution:', institute.slug);
  console.log('Login with instituteSlug "demo-institution", any seeded email above, password "password123"');
  console.log('Admin login:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
