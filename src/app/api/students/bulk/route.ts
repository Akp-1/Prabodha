import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const studentRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  batchId: z.string().optional(),
});

const bodySchema = z.object({
  students: z.array(studentRowSchema).min(1, 'At least one student is required').max(500, 'Maximum 500 students per import'),
});

/**
 * Generates a password in the format: Name@XXXX
 * - First name with first letter capitalized
 * - @ separator
 * - 4 random digits
 * Example: Rohan@4827, Priya@9153
 */
function generatePassword(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || 'Student';
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  const digits = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit: 1000-9999
  return `${capitalized}@${digits}`;
}

/**
 * POST /api/students/bulk
 * Admin-only. Creates multiple students in a single transaction.
 * Auto-generates Name@XXXX passwords. Returns plaintext passwords
 * in the response (only time they're visible — stored as hashes).
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  requireRole(user, 'admin');

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid request body');
  }

  const { students } = body.data;

  // Pre-validate: check for duplicate emails within the submitted batch
  const emailSet = new Set<string>();
  const duplicatesInBatch: Array<{ row: number; name: string; email: string; message: string }> = [];
  const uniqueStudents: Array<{ index: number; name: string; email: string; phone?: string; batchId?: string }> = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const normalizedEmail = s.email.trim().toLowerCase();
    if (emailSet.has(normalizedEmail)) {
      duplicatesInBatch.push({ row: i + 1, name: s.name, email: normalizedEmail, message: 'Duplicate email in import' });
    } else {
      emailSet.add(normalizedEmail);
      uniqueStudents.push({ index: i, name: s.name, email: normalizedEmail, phone: s.phone, batchId: s.batchId });
    }
  }

  // Check which emails already exist in the database for this institute
  const existingUsers = await prisma.user.findMany({
    where: {
      instituteId: user.instituteId,
      email: { in: uniqueStudents.map((s) => s.email) },
    },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  // If batchIds are provided, validate they belong to this institute
  const batchIds = [...new Set(uniqueStudents.map((s) => s.batchId).filter(Boolean))] as string[];
  let validBatchIds = new Set<string>();
  if (batchIds.length > 0) {
    const batches = await prisma.batch.findMany({
      where: { instituteId: user.instituteId, id: { in: batchIds } },
      select: { id: true },
    });
    validBatchIds = new Set(batches.map((b) => b.id));
  }

  // Separate valid from invalid
  const toCreate: Array<{ index: number; name: string; email: string; phone?: string; batchId?: string; password: string }> = [];
  const errors: Array<{ row: number; name: string; email: string; message: string }> = [...duplicatesInBatch];

  for (const s of uniqueStudents) {
    if (existingEmails.has(s.email)) {
      errors.push({ row: s.index + 1, name: s.name, email: s.email, message: 'Email already exists in this institute' });
      continue;
    }
    if (s.batchId && !validBatchIds.has(s.batchId)) {
      errors.push({ row: s.index + 1, name: s.name, email: s.email, message: `Batch not found: ${s.batchId}` });
      continue;
    }
    const password = generatePassword(s.name);
    toCreate.push({ ...s, password });
  }

  // Create all valid students in a transaction
  const created: Array<{ name: string; email: string; password: string }> = [];

  if (toCreate.length > 0) {
    // Hash all passwords in parallel
    const hashes = await Promise.all(toCreate.map((s) => hashPassword(s.password)));

    await prisma.$transaction(
      toCreate.map((s, i) =>
        prisma.user.create({
          data: {
            instituteId: user.instituteId,
            role: 'student',
            name: s.name.trim(),
            email: s.email,
            phone: s.phone?.trim() || null,
            passwordHash: hashes[i],
            batchId: s.batchId || null,
          },
        })
      )
    );

    created.push(...toCreate.map((s) => ({ name: s.name, email: s.email, password: s.password })));
  }

  return NextResponse.json(
    {
      created,
      errors,
      summary: {
        total: students.length,
        successful: created.length,
        failed: errors.length,
      },
    },
    { status: 201 }
  );
});
