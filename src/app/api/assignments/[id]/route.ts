import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    teacher: { select: { id: true, name: true, email: true } },
};

async function findAssignment(id: string, instituteId: string) {
    return prisma.batchSubjectTeacher.findFirst({
        where: { id, instituteId },
        include,
    });
}

export const GET = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    const id = context?.params?.id || '';

    const assignment = await findAssignment(id, user.instituteId);
    if (!assignment) throw new ApiError(404, 'Assignment not found');

    if (user.role === 'teacher' && assignment.teacherId !== user.sub) {
        throw new ApiError(403, 'You do not have permission to do this');
    } else if (user.role !== 'teacher') {
        requireRole(user, 'admin');
    }

    return NextResponse.json(assignment);
});

// Reassigning to a different teacher is the only realistic edit here —
// batch/subject are the identity of the row (unique together), so changing
// either is really "create a new assignment", handled via delete + POST.
const patchSchema = z.object({
    teacherId: z.string().min(1),
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = context?.params?.id || '';

    const body = patchSchema.parse(await request.json());

    const existing = await findAssignment(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Assignment not found');

    const teacher = await prisma.user.findFirst({
        where: { id: body.teacherId, instituteId: user.instituteId, role: 'teacher' },
    });
    if (!teacher) throw new ApiError(404, 'Teacher not found');
    if (!teacher.isActive) throw new ApiError(400, 'Cannot assign an inactive teacher');

    const assignment = await prisma.batchSubjectTeacher.update({
        where: { id },
        data: { teacherId: body.teacherId },
        include,
    });

    return NextResponse.json(assignment);
});

// Hard delete: this is a structural link (like batches/subjects), not a
// person, so it's removed outright rather than soft-deleted. Deleting it
// also cascades to any dependent TimetableSlot rows (see schema).
export const DELETE = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = context?.params?.id || '';

    const existing = await findAssignment(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Assignment not found');

    await prisma.batchSubjectTeacher.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});