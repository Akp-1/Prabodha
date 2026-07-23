import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest, { params }) => {
  const user = requireAuth(request);
  const id = params.id;

  const batch = await prisma.batch.findUnique({
    where: { id, instituteId: user.instituteId },
    include: {
      students: {
        where: { isActive: true },
        select: { id: true, name: true, email: true, phone: true }
      },
      bst: {
        include: {
          subject: true,
          teacher: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!batch) throw new ApiError(404, 'Batch not found');

  return NextResponse.json(batch);
});

const patchSchema = z.object({
  name: z.string().min(1, 'Batch name cannot be empty').optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');
  const id = params.id;

  const body = patchSchema.parse(await request.json());

  const existing = await prisma.batch.findUnique({ where: { id, instituteId: user.instituteId } });
  if (!existing) throw new ApiError(404, 'Batch not found');

  const batch = await prisma.batch.update({
    where: { id },
    data: body
  });

  return NextResponse.json(batch);
});

export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');
  const id = params.id;

  const existing = await prisma.batch.findUnique({ where: { id, instituteId: user.instituteId } });
  if (!existing) throw new ApiError(404, 'Batch not found');

  await prisma.batch.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
