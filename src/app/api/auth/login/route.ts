import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword, signToken, type Role } from '@/lib/auth';
import { apiHandler, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  instituteSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Used by all four roles. instituteSlug is required because the same email
 * could exist at two different institutes — it tells us which one to check.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    throw new ApiError(400, 'instituteSlug, email and password are required');
  }
  const { instituteSlug, email, password } = body.data;

  const institute = await prisma.institute.findUnique({ where: { slug: instituteSlug } });
  if (!institute) throw new ApiError(401, 'Invalid email or password');

  const user = await prisma.user.findUnique({
    where: { instituteId_email: { instituteId: institute.id, email: email.toLowerCase() } },
  });
  if (!user) throw new ApiError(401, 'Invalid email or password');

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been disabled. Contact your institute admin.');
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) throw new ApiError(401, 'Invalid email or password');

  const token = signToken({ sub: user.id, instituteId: institute.id, role: user.role as Role });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});
