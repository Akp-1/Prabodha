import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  
  const batches = await prisma.batch.findMany({
    where: { instituteId: user.instituteId },
    include: {
      _count: {
        select: { students: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json(batches);
});

const postSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');

  const body = postSchema.parse(await request.json());

  const batch = await prisma.batch.create({
    data: {
      name: body.name,
      instituteId: user.instituteId,
    }
  });

  return NextResponse.json(batch, { status: 201 });
});
