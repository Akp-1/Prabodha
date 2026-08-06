import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// AttendanceSession has no Prisma relation field to BatchSubjectTeacher —
// only the raw batchSubjectTeacherId column (unlike TimetableSlot, which
// does declare a `bst` relation). So instead of `include`/`where: { bst }`,
// we resolve BatchSubjectTeacher rows ourselves and attach them by hand.

async function attachBst<T extends { batchSubjectTeacherId: string }>(sessions: T[]) {
    const ids = [...new Set(sessions.map((s) => s.batchSubjectTeacherId))];
    const bsts = await prisma.batchSubjectTeacher.findMany({
        where: { id: { in: ids } },
        include: {
            batch: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
        },
    });
    const byId = new Map(bsts.map((b) => [b.id, b]));
    return sessions.map((s) => ({ ...s, bst: byId.get(s.batchSubjectTeacherId) ?? null }));
}

function summarize(session: { records: { studentId: string; status: string }[] } & Record<string, unknown>) {
    const total = session.records.length;
    const present = session.records.filter((r) => r.status === 'present').length;
    return { ...session, summary: { total, present, absent: total - present } };
}

/** Strips every record except the student's own before the response goes out
 * — a student must never see a classmate's present/absent status. Mirrors the
 * same pattern used for Marks (src/app/api/exams/route.ts's hideOthersMarks). */
function hideOthersRecords<T extends { records: { studentId: string; status: string }[] }>(session: T, studentId: string) {
    const mine = session.records.find((r) => r.studentId === studentId) ?? null;
    return { ...session, records: mine ? [mine] : [], myRecord: mine };
}

/** Parent equivalent of hideOthersRecords: a parent may have more than one
 * linked child, so unlike a student's single `myRecord`, we keep the filtered
 * `records` array (each entry carries `student.name` so the UI can label
 * which child a row belongs to) plus a `myRecord` convenience field that's
 * only populated when exactly one linked child appears in this session —
 * the common case, and the one the existing student-facing tab UI already
 * knows how to render. */
function hideRecordsExceptChildren<T extends { records: { studentId: string; status: string; student?: { name: string } }[] }>(
    session: T,
    childIds: string[]
) {
    const mine = session.records.filter((r) => childIds.includes(r.studentId));
    return { ...session, records: mine, myRecord: mine.length === 1 ? mine[0] : null };
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student', 'parent');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;
    const date = request.nextUrl.searchParams.get('date') || undefined;
    const from = request.nextUrl.searchParams.get('from') || undefined;
    const to = request.nextUrl.searchParams.get('to') || undefined;

    // Resolve which BatchSubjectTeacher ids are in scope, based on the filters
    // and the caller's role, then filter sessions by that id list — since we
    // can't traverse the relation directly in the `where` clause.
    let studentBatchId: string | undefined;
    if (user.role === 'student') {
        const self = await prisma.user.findFirst({
            where: { id: user.sub, instituteId: user.instituteId, role: 'student' },
            select: { batchId: true },
        });
        studentBatchId = self?.batchId ?? '__none__';
    }

    // Read-only: a parent sees attendance for every batch their linked
    // student(s) belong to — same ParentStudentLink-resolved scope used by
    // Homework and Materials. `childIds` is used later to filter each
    // session's records down to just the parent's own children.
    let childIds: string[] = [];
    let linkedBatchIds: string[] = [];
    if (user.role === 'parent') {
        const links = await prisma.parentStudentLink.findMany({
            where: { parentId: user.sub, instituteId: user.instituteId },
            select: { student: { select: { id: true, batchId: true } } },
        });
        childIds = links.map((l) => l.student.id);
        linkedBatchIds = [...new Set(links.map((l) => l.student.batchId).filter((b): b is string => !!b))];
    }

    let bstFilter: { in: string[] } | undefined;
    if (batchId || subjectId || user.role === 'teacher' || user.role === 'student' || user.role === 'parent') {
        const matchingBsts = await prisma.batchSubjectTeacher.findMany({
            where: {
                instituteId: user.instituteId,
                ...(user.role === 'student' ? { batchId: studentBatchId } : {}),
                ...(user.role === 'parent' ? { batchId: { in: linkedBatchIds.length ? linkedBatchIds : ['__none__'] } } : {}),
                ...(user.role !== 'student' && user.role !== 'parent' && batchId ? { batchId } : {}),
                ...(subjectId ? { subjectId } : {}),
                ...(user.role === 'teacher' ? { teacherId: user.sub } : {}),
            },
            select: { id: true },
        });
        bstFilter = { in: matchingBsts.map((b) => b.id) };
    }

    const sessions = await prisma.attendanceSession.findMany({
        where: {
            instituteId: user.instituteId,
            ...(date ? { sessionDate: new Date(date) } : {}),
            ...(from || to
                ? {
                    sessionDate: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
            ...(bstFilter ? { batchSubjectTeacherId: bstFilter } : {}),
        },
        include: {
            records: { select: { studentId: true, status: true, student: { select: { name: true } } } },
        },
        orderBy: { sessionDate: 'desc' },
    });

    const withBst = await attachBst(sessions);
    const summarized = withBst.map(summarize);
    const response =
        user.role === 'student'
            ? summarized.map((s) => hideOthersRecords(s, user.sub))
            : user.role === 'parent'
                ? summarized.map((s) => hideRecordsExceptChildren(s, childIds))
                : summarized;

    return NextResponse.json(response);
});

const postSchema = z.object({
    batchSubjectTeacherId: z.string().min(1),
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    records: z
        .array(
            z.object({
                studentId: z.string().min(1),
                status: z.enum(['present', 'absent']),
            })
        )
        .min(1, 'At least one student record is required'),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const body = postSchema.parse(await request.json());

    const bst = await prisma.batchSubjectTeacher.findFirst({
        where: { id: body.batchSubjectTeacherId, instituteId: user.instituteId },
    });
    if (!bst) throw new ApiError(404, 'Assignment (batch/subject/teacher) not found');

    // A teacher can only mark attendance for their own assignment; admins can
    // mark (or substitute-mark) for anyone.
    if (user.role === 'teacher' && bst.teacherId !== user.sub) {
        throw new ApiError(403, 'You do not have permission to do this');
    }

    const studentIds = body.records.map((r) => r.studentId);
    if (new Set(studentIds).size !== studentIds.length) {
        throw new ApiError(400, 'Duplicate studentId in records');
    }

    const students = await prisma.user.findMany({
        where: { id: { in: studentIds }, instituteId: user.instituteId, role: 'student', batchId: bst.batchId },
    });
    if (students.length !== studentIds.length) {
        throw new ApiError(400, 'One or more students do not belong to this batch');
    }

    // Unique constraint on [batchSubjectTeacherId, sessionDate] means a second
    // submission for the same class on the same day hits P2002 → 409 via
    // apiHandler, rather than silently duplicating the session.
    const session = await prisma.attendanceSession.create({
        data: {
            instituteId: user.instituteId,
            batchSubjectTeacherId: body.batchSubjectTeacherId,
            sessionDate: new Date(body.sessionDate),
            markedBy: user.sub,
            records: {
                create: body.records.map((r) => ({ studentId: r.studentId, status: r.status })),
            },
        },
        include: {
            records: { select: { id: true, studentId: true, status: true } },
        },
    });

    const [withBst] = await attachBst([session]);
    return NextResponse.json(withBst, { status: 201 });
});