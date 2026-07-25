import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';
import { teacherContentScope, requireCurrentlyAssigned } from '@/lib/content-scope';

export const dynamic = 'force-dynamic';

const include = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    creator: { select: { id: true, name: true } },
};

function summarize(exam: { marks: { marksObtained: number }[]; maxMarks: number } & Record<string, unknown>) {
    const count = exam.marks.length;
    const average = count ? exam.marks.reduce((sum, m) => sum + m.marksObtained, 0) / count : null;
    return { ...exam, summary: { studentsGraded: count, average } };
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;

    const exams = await prisma.exam.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(await teacherContentScope(user)),
        },
        include: { ...include, marks: { select: { marksObtained: true } } },
        orderBy: { examDate: 'desc' },
    });

    return NextResponse.json(exams.map(summarize));
});

const postSchema = z.object({
    batchId: z.string().min(1),
    subjectId: z.string().min(1),
    name: z.string().min(1),
    examDate: z.string().refine((d) => !isNaN(new Date(d).getTime()), 'Invalid examDate'),
    maxMarks: z.number().positive(),
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

    await requireCurrentlyAssigned(user, body.batchId, body.subjectId);

    const exam = await prisma.exam.create({
        data: {
            instituteId: user.instituteId,
            batchId: body.batchId,
            subjectId: body.subjectId,
            createdBy: user.sub,
            name: body.name,
            examDate: new Date(body.examDate),
            maxMarks: body.maxMarks,
        },
        include: { ...include, marks: { select: { marksObtained: true } } },
    });

    return NextResponse.json(summarize(exam), { status: 201 });
});