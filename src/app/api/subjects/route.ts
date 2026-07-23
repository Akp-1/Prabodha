import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  
  const subjects = await prisma.subject.findMany({
    where: { instituteId: user.instituteId },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json(subjects);
});

const postSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');

  const body = postSchema.parse(await request.json());

  const subject = await prisma.subject.create({
    data: {
      name: body.name,
      instituteId: user.instituteId,
    }
  });

  return NextResponse.json(subject, { status: 201 });
});
