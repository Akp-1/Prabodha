
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    assigner: { select: { id: true, name: true } },
};

function summarize(hw: { statuses: { status: string }[] } & Record<string, unknown>) {
    const total = hw.statuses.length;
    const completed = hw.statuses.filter((s) => s.status === 'completed').length;
    return { ...hw, summary: { total, completed, pending: total - completed } };
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student', 'parent');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;

    let scopeFilter = {};
    if (user.role === 'teacher') {
        const pairs = await prisma.batchSubjectTeacher.findMany({
            where: { teacherId: user.sub, instituteId: user.instituteId },
            select: { batchId: true, subjectId: true },
        });
        scopeFilter = {
            OR: pairs.length ? pairs.map((p) => ({ batchId: p.batchId, subjectId: p.subjectId })) : [{ id: '__none__' }],
        };
    } else if (user.role === 'student') {
        // Read-only: a student sees homework for their own batch. Marking
        // their own status is handled by PATCH /api/homework/[id], not here.
        const self = await prisma.user.findFirst({
            where: { id: user.sub, instituteId: user.instituteId, role: 'student' },
            select: { batchId: true },
        });
        scopeFilter = { batchId: self?.batchId ?? '__none__' };
    } else if (user.role === 'parent') {
        // Read-only: a parent sees homework for every batch their linked
        // student(s) belong to. The UI picks out each linked student's own
        // entry from `statuses` — same pattern as a student picking out
        // their own row, just resolved via ParentStudentLink instead of a
        // direct self-lookup.
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: user.sub, instituteId: user.instituteId },
            select: { student: { select: { batchId: true } } },
        });
        const batchIds = [...new Set(links.map((l) => l.student.batchId).filter((b): b is string => !!b))];
        scopeFilter = { batchId: { in: batchIds.length ? batchIds : ['__none__'] } };
    }

    const homework = await prisma.homework.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...scopeFilter,
        },
        // studentId included (not just status) so a student-facing UI can
        // pick out their own row from the array without a second request.
        include: { ...include, statuses: { select: { studentId: true, status: true } } },
        orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(homework.map(summarize));
});

const postSchema = z.object({
    batchId: z.string().min(1),
    subjectId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().refine((d) => !isNaN(new Date(d).getTime()), 'Invalid dueDate'),
    fileUrl: z.string().optional(),
    filePath: z.string().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const body = postSchema.parse(await request.json());

    const [batch, subject] = await Promise.all([
        prisma.batch.findFirst({ where: { id: body.batchId, instituteId: user.instituteId } }),
        prisma.subject.findFirst({ where: { id: body.subjectId, instituteId: user.instituteId } }),
    ]);
    if (!batch) throw new ApiError(404, 'Batch not found');
    if (!subject) throw new ApiError(404, 'Subject not found');

    if (user.role === 'teacher') {
        const assigned = await prisma.batchSubjectTeacher.findFirst({
            where: { teacherId: user.sub, instituteId: user.instituteId, batchId: body.batchId, subjectId: body.subjectId },
        });
        if (!assigned) throw new ApiError(403, 'You are not assigned to teach this subject for this batch');
    }

    // A HomeworkStatus row is created for every active student currently in
    // the batch, at assignment time — this is a snapshot of the roster, not a
    // live query, matching the schema comment ("created the moment homework
    // is assigned").
    const students = await prisma.user.findMany({
        where: { instituteId: user.instituteId, role: 'student', batchId: body.batchId, isActive: true },
        select: { id: true },
    });

    const homework = await prisma.homework.create({
        data: {
            instituteId: user.instituteId,
            batchId: body.batchId,
            subjectId: body.subjectId,
            assignedBy: user.sub,
            title: body.title,
            description: body.description,
            dueDate: new Date(body.dueDate),
            fileUrl: body.fileUrl,
            filePath: body.filePath,
            statuses: {
                create: students.map((s) => ({ studentId: s.id })), // status defaults to 'pending'
            },
        },
        include: { ...include, statuses: { include: { student: { select: { id: true, name: true } } } } },
    });

    return NextResponse.json(homework, { status: 201 });
});