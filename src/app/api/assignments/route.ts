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

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;
    const teacherId = request.nextUrl.searchParams.get('teacherId') || undefined;

    // Teachers can only see their own assignments; admins can see everything
    // and optionally filter by any of the three dimensions.
    if (user.role === 'teacher') {
        requireRole(user, 'teacher'); // no-op guard, keeps intent explicit
    } else {
        requireRole(user, 'admin');
    }

    const assignments = await prisma.batchSubjectTeacher.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(user.role === 'teacher' ? { teacherId: user.sub } : teacherId ? { teacherId } : {}),
        },
        include,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assignments);
});

const postSchema = z.object({
    batchId: z.string().min(1),
    subjectId: z.string().min(1),
    teacherId: z.string().min(1),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const [batch, subject, teacher] = await Promise.all([
        prisma.batch.findUnique({ where: { id: body.batchId, instituteId: user.instituteId } }),
        prisma.subject.findUnique({ where: { id: body.subjectId, instituteId: user.instituteId } }),
        prisma.user.findFirst({ where: { id: body.teacherId, instituteId: user.instituteId, role: 'teacher' } }),
    ]);

    if (!batch) throw new ApiError(404, 'Batch not found');
    if (!subject) throw new ApiError(404, 'Subject not found');
    if (!teacher) throw new ApiError(404, 'Teacher not found');
    if (!teacher.isActive) throw new ApiError(400, 'Cannot assign an inactive teacher');

    // Unique constraint on [batchId, subjectId] means this batch/subject pair
    // can only ever have one teacher — a repeat call hits P2002, handled by
    // apiHandler as a 409.
    const assignment = await prisma.batchSubjectTeacher.create({
        data: {
            instituteId: user.instituteId,
            batchId: body.batchId,
            subjectId: body.subjectId,
            teacherId: body.teacherId,
        },
        include,
    });

    return NextResponse.json(assignment, { status: 201 });
});