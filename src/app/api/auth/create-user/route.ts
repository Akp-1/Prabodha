import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  role: z.enum(['teacher', 'student', 'parent']),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Admin-only. This is how Teacher/Student/Parent logins get created — they
 * never self-register.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authUser = requireAuth(request);
  requireRole(authUser, 'admin');

  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid request body');
  }
  const { role, name, email, phone, password } = body.data;

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      instituteId: authUser.instituteId,
      role,
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
    },
  });

  return NextResponse.json(
    { user: { id: user.id, role: user.role, name: user.name, email: user.email } },
    { status: 201 }
  );
});
