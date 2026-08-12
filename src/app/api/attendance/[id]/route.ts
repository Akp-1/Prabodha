import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// See route.ts — AttendanceSession has no Prisma relation to
// BatchSubjectTeacher, only the raw batchSubjectTeacherId column, so it's
// resolved manually rather than via `include`.
async function findSessionWithBst(id: string, instituteId: string) {
    const session = await prisma.attendanceSession.findFirst({
        where: { id, instituteId },
        include: {
            marker: { select: { id: true, name: true } },
            records: { include: { student: { select: { id: true, name: true } } } },
        },
    });
    if (!session) return null;

    const bst = await prisma.batchSubjectTeacher.findUnique({
        where: { id: session.batchSubjectTeacherId },
        include: {
            batch: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
        },
    });

    return { ...session, bst };
}

function canAccess(user: { role: string; sub: string }, session: { bst: { teacherId: string } | null }) {
    return user.role === 'admin' || session.bst?.teacherId === user.sub;
}

export const GET = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = context?.params?.id || '';

    const session = await findSessionWithBst(id, user.instituteId);
    if (!session) throw new ApiError(404, 'Attendance session not found');

    if (!canAccess(user, session)) throw new ApiError(403, 'You do not have permission to do this');

    return NextResponse.json(session);
});

// Corrects existing records only — a record's studentId must already be part
// of the session (created at POST time from the batch roster). Adding a
// student who wasn't in the original roster isn't allowed here; re-submit a
// new session if the roster itself was wrong.
const patchSchema = z.object({
    records: z
        .array(
            z.object({
                studentId: z.string().min(1),
                status: z.enum(['present', 'absent']),
            })
        )
        .min(1),
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = context?.params?.id || '';

    const body = patchSchema.parse(await request.json());

    const session = await findSessionWithBst(id, user.instituteId);
    if (!session) throw new ApiError(404, 'Attendance session not found');
    if (!canAccess(user, session)) throw new ApiError(403, 'You do not have permission to do this');

    const existingStudentIds = new Set(session.records.map((r) => r.studentId));
    for (const r of body.records) {
        if (!existingStudentIds.has(r.studentId)) {
            throw new ApiError(400, `Student ${r.studentId} is not part of this attendance session`);
        }
    }

    await prisma.$transaction(
        body.records.map((r) =>
            prisma.attendanceRecord.update({
                where: { sessionId_studentId: { sessionId: id, studentId: r.studentId } },
                data: { status: r.status },
            })
        )
    );

    const updated = await findSessionWithBst(id, user.instituteId);
    return NextResponse.json(updated);
});

// Hard delete — an attendance session is an event record, not a person, and
// there's no isActive concept on it in the schema. Cascades to its
// AttendanceRecord rows.
export const DELETE = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = context?.params?.id || '';

    const session = await findSessionWithBst(id, user.instituteId);
    if (!session) throw new ApiError(404, 'Attendance session not found');
    if (!canAccess(user, session)) throw new ApiError(403, 'You do not have permission to do this');

    await prisma.attendanceSession.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});