import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { apiHandler, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  instituteSlug: z.string().min(1),
  email: z.string().email(),
});

/**
 * Always responds the same way whether or not the account exists, so we
 * don't leak which emails are registered.
 *
 * devResetToken is returned directly in the response FOR LOCAL TESTING
 * ONLY. Once an email provider (e.g. Resend's free tier) is wired up,
 * email resetToken to the user instead and delete the devResetToken line.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) throw new ApiError(400, 'instituteSlug and email are required');
  const { instituteSlug, email } = body.data;

  const institute = await prisma.institute.findUnique({ where: { slug: instituteSlug } });
  const user = institute
    ? await prisma.user.findUnique({
        where: { instituteId_email: { instituteId: institute.id, email: email.toLowerCase() } },
      })
    : null;

  if (!user) {
    return NextResponse.json({ message: 'If that account exists, a reset link has been sent.' });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return NextResponse.json({
    message: 'If that account exists, a reset link has been sent.',
    devResetToken: resetToken, // TODO: remove once email sending is wired up
  });
});
