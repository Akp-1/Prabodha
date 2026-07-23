import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { hashPassword, signToken, type Role } from '@/lib/auth';
import { apiHandler, ApiError } from '@/lib/rbac';
import { slugify } from '@/lib/slugify';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  instituteName: z.string().min(1),
  adminName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * The only self-service signup in the whole app — this creates an
 * institute AND its first Admin account in one step. Everyone else
 * (teachers, students, parents) gets created BY that admin, via
 * POST /api/auth/create-user.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) {
    throw new ApiError(400, body.error.issues[0]?.message ?? 'Invalid request body');
  }
  const { instituteName, adminName, email, phone, password } = body.data;

  let slug = slugify(instituteName);
  const existing = await prisma.institute.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
  }

  const passwordHash = await hashPassword(password);

  const { institute, admin } = await prisma.$transaction(async (tx) => {
    const institute = await tx.institute.create({
      data: { name: instituteName, slug },
    });
    const admin = await tx.user.create({
      data: {
        instituteId: institute.id,
        role: 'admin',
        name: adminName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
      },
    });
    return { institute, admin };
  });

  const token = signToken({ sub: admin.id, instituteId: institute.id, role: admin.role as Role });

  return NextResponse.json(
    {
      token,
      institute: { id: institute.id, name: institute.name, slug: institute.slug },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    },
    { status: 201 }
  );
});
