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

function summarize(exam: { marks: { studentId: string; marksObtained: number; remarks: string | null }[]; maxMarks: number } & Record<string, unknown>) {
    const count = exam.marks.length;
    const average = count ? exam.marks.reduce((sum, m) => sum + m.marksObtained, 0) / count : null;
    return { ...exam, summary: { studentsGraded: count, average } };
}

/** Strips every mark except the student's own before the response goes out —
 * a student must never see a classmate's score. The class-wide summary
 * (average/studentsGraded) is computed beforehand, from the full set, and is
 * fine to keep since it doesn't identify any individual student. */
function hideOthersMarks<T extends { marks: { studentId: string; marksObtained: number; remarks: string | null }[] }>(
    exam: T,
    studentId: string
) {
    const mine = exam.marks.find((m) => m.studentId === studentId) ?? null;
    return { ...exam, marks: mine ? [mine] : [], myMark: mine };
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;

    let scopeFilter = {};
    if (user.role === 'student') {
        const self = await prisma.user.findFirst({
            where: { id: user.sub, instituteId: user.instituteId, role: 'student' },
            select: { batchId: true },
        });
        scopeFilter = { batchId: self?.batchId ?? '__none__' };
    }

    const exams = await prisma.exam.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(user.role === 'student' ? scopeFilter : await teacherContentScope(user)),
        },
        include: { ...include, marks: { select: { studentId: true, marksObtained: true, remarks: true } } },
        orderBy: { examDate: 'desc' },
    });

    const summarized = exams.map(summarize);
    const response = user.role === 'student' ? summarized.map((e) => hideOthersMarks(e, user.sub)) : summarized;

    return NextResponse.json(response);
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
        prisma.batch.findFirst({where: {id: body.batchId, instituteId: user.instituteId}}),
        prisma.subject.findFirst({where: {id: body.subjectId, instituteId: user.instituteId}}),
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
        include: {...include, marks: {select: {studentId: true, marksObtained: true, remarks: true}}},
    });

    return NextResponse.json(summarize(exam), {status: 201});
});