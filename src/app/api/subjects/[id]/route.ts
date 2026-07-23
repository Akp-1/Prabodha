import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireAuth(request);
  const id = params.id;

  const subject = await prisma.subject.findUnique({
    where: { id, instituteId: user.instituteId }
  });

  if (!subject) throw new ApiError(404, 'Subject not found');

  return NextResponse.json(subject);
});

const patchSchema = z.object({
  name: z.string().min(1, 'Subject name cannot be empty').optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');
  const id = params.id;

  const body = patchSchema.parse(await request.json());

  const existing = await prisma.subject.findUnique({ where: { id, instituteId: user.instituteId } });
  if (!existing) throw new ApiError(404, 'Subject not found');

  const subject = await prisma.subject.update({
    where: { id },
    data: body
  });

  return NextResponse.json(subject);
});

export const DELETE = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');
  const id = params.id;

  const existing = await prisma.subject.findUnique({ where: { id, instituteId: user.instituteId } });
  if (!existing) throw new ApiError(404, 'Subject not found');

  await prisma.subject.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
});
