import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiHandler, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'resetToken and newPassword are required');
  }
  const { resetToken, newPassword } = body.data;

  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });

  if (!record || record.used || record.expiresAt < new Date()) {
    throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  return NextResponse.json({ message: 'Password updated. You can now log in with your new password.' });
});
