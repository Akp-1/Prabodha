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

/** Parent equivalent of hideOthersMarks — same ParentStudentLink-resolved
 * scoping pattern used by Homework, Materials, and Attendance. A parent may
 * have more than one linked child, so `marks` stays a filtered array (each
 * entry carries `student.name` so the UI can label whose score it is) while
 * `myMark` is only populated when exactly one linked child has a mark for
 * this exam — the common case, matching what the existing student-facing UI
 * already knows how to render. */
function hideMarksExceptChildren<
    T extends { marks: { studentId: string; marksObtained: number; remarks: string | null; student?: { name: string } }[] }
>(exam: T, childIds: string[]) {
    const mine = exam.marks.filter((m) => childIds.includes(m.studentId));
    return { ...exam, marks: mine, myMark: mine.length === 1 ? mine[0] : null };
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student', 'parent');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;

    let scopeFilter = {};
    let childIds: string[] = [];
    if (user.role === 'student') {
        const self = await prisma.user.findFirst({
            where: { id: user.sub, instituteId: user.instituteId, role: 'student' },
            select: { batchId: true },
        });
        scopeFilter = { batchId: self?.batchId ?? '__none__' };
    } else if (user.role === 'parent') {
        // Read-only: a parent sees exams for every batch their linked
        // student(s) belong to — same ParentStudentLink-resolved scope used
        // by Homework, Materials, and Attendance.
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: user.sub, instituteId: user.instituteId },
            select: { student: { select: { id: true, batchId: true } } },
        });
        childIds = links.map((l) => l.student.id);
        const batchIds = [...new Set(links.map((l) => l.student.batchId).filter((b): b is string => !!b))];
        scopeFilter = { batchId: { in: batchIds.length ? batchIds : ['__none__'] } };
    }

    const exams = await prisma.exam.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(user.role === 'student' || user.role === 'parent' ? scopeFilter : await teacherContentScope(user)),
        },
        include: {
            ...include,
            marks: { select: { studentId: true, marksObtained: true, remarks: true, student: { select: { name: true } } } },
        },
        orderBy: { examDate: 'desc' },
    });

    const summarized = exams.map(summarize);
    const response =
        user.role === 'student'
            ? summarized.map((e) => hideOthersMarks(e, user.sub))
            : user.role === 'parent'
                ? summarized.map((e) => hideMarksExceptChildren(e, childIds))
                : summarized;

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