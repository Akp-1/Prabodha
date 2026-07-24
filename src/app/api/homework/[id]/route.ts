import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const fullInclude = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    assigner: { select: { id: true, name: true } },
    statuses: { include: { student: { select: { id: true, name: true } } } },
};

async function findHomework(id: string, instituteId: string) {
    return prisma.homework.findFirst({ where: { id, instituteId }, include: fullInclude });
}

function canWrite(user: { role: string; sub: string }, homework: { assignedBy: string }) {
    return user.role === 'admin' || homework.assignedBy === user.sub;
}

async function canRead(user: { role: string; sub: string; instituteId: string }, homework: { batchId: string; subjectId: string }) {
    if (user.role === 'admin') return true;
    const assigned = await prisma.batchSubjectTeacher.findFirst({
        where: { teacherId: user.sub, instituteId: user.instituteId, batchId: homework.batchId, subjectId: homework.subjectId },
    });
    return !!assigned;
}

export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const homework = await findHomework(id, user.instituteId);
    if (!homework) throw new ApiError(404, 'Homework not found');
    if (!(await canRead(user, homework))) throw new ApiError(403, 'You do not have permission to do this');

    return NextResponse.json(homework);
});

// batchId/subjectId aren't editable — changing them would mean a different
// roster of HomeworkStatus rows entirely, so that's delete + re-create.
// `statuses` lets admin/the assigner correct a student's completion status
// directly, same pattern as Attendance's record corrections.
const patchSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    dueDate: z
        .string()
        .refine((d) => !isNaN(new Date(d).getTime()), 'Invalid dueDate')
        .optional(),
    fileUrl: z.string().nullable().optional(),
    filePath: z.string().nullable().optional(),
    statuses: z
        .array(z.object({ studentId: z.string().min(1), status: z.enum(['pending', 'completed']) }))
        .optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const body = patchSchema.parse(await request.json());

    const existing = await findHomework(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Homework not found');
    if (!canWrite(user, existing)) throw new ApiError(403, 'You do not have permission to do this');

    if (body.statuses?.length) {
        const existingStudentIds = new Set(existing.statuses.map((s) => s.studentId));
        for (const s of body.statuses) {
            if (!existingStudentIds.has(s.studentId)) {
                throw new ApiError(400, `Student ${s.studentId} is not part of this homework's roster`);
            }
        }
        await prisma.$transaction(
            body.statuses.map((s) =>
                prisma.homeworkStatus.update({
                    where: { homeworkId_studentId: { homeworkId: id, studentId: s.studentId } },
                    data: { status: s.status },
                })
            )
        );
    }

    const { statuses, ...fields } = body;
    const homework = await prisma.homework.update({
        where: { id },
        data: {
            ...fields,
            dueDate: fields.dueDate ? new Date(fields.dueDate) : undefined,
        },
        include: fullInclude,
    });

    return NextResponse.json(homework);
});

// Hard delete — cascades to HomeworkStatus rows.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const existing = await findHomework(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Homework not found');
    if (!canWrite(user, existing)) throw new ApiError(403, 'You do not have permission to do this');

    await prisma.homework.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});