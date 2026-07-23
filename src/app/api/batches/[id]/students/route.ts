import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  studentIds: z.array(z.string()),
});

export const POST = apiHandler(async (request: NextRequest, { params }) => {
  const user = requireAuth(request);
  requireRole(user, 'admin');
  const batchId = params.id;

  const body = postSchema.parse(await request.json());

  const batch = await prisma.batch.findUnique({ where: { id: batchId, instituteId: user.instituteId } });
  if (!batch) throw new ApiError(404, 'Batch not found');

  // Verify all students belong to the institute and are students
  const students = await prisma.user.findMany({
    where: { 
      id: { in: body.studentIds }, 
      instituteId: user.instituteId,
      role: 'student' 
    }
  });

  if (students.length !== body.studentIds.length) {
    throw new ApiError(400, 'One or more invalid student IDs provided or they do not belong to this institute');
  }

  // Update batchId for all provided students
  await prisma.user.updateMany({
    where: { id: { in: body.studentIds } },
    data: { batchId }
  });

  return NextResponse.json({ message: 'Students assigned successfully', assignedCount: students.length });
});
