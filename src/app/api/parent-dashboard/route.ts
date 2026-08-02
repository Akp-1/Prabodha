import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * GET /api/parent-dashboard
 *
 * Returns a consolidated academic overview for every child linked to the
 * authenticated parent. Each entry includes the student profile, attendance
 * summary, homework status breakdown, and the most recent exam marks.
 *
 * Only accessible by users with the `parent` role.
 */
export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'parent');

    // 1. Find all children linked to this parent
    const links = await prisma.parentStudentLink.findMany({
        where: { instituteId: user.instituteId, parentId: user.sub },
        include: {
            student: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    batchId: true,
                    batch: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (links.length === 0) {
        return NextResponse.json([]);
    }

    const studentIds = links.map((l) => l.student.id);

    // 2. Attendance — count present/absent records per student
    const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true },
    });

    const attendanceByStudent = new Map<string, { total: number; present: number; absent: number }>();
    for (const rec of attendanceRecords) {
        const entry = attendanceByStudent.get(rec.studentId) ?? { total: 0, present: 0, absent: 0 };
        entry.total++;
        if (rec.status === 'present') entry.present++;
        else entry.absent++;
        attendanceByStudent.set(rec.studentId, entry);
    }

    // 3. Homework — count pending/completed per student
    const homeworkStatuses = await prisma.homeworkStatus.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, status: true },
    });

    const homeworkByStudent = new Map<string, { total: number; completed: number; pending: number }>();
    for (const hs of homeworkStatuses) {
        const entry = homeworkByStudent.get(hs.studentId) ?? { total: 0, completed: 0, pending: 0 };
        entry.total++;
        if (hs.status === 'completed') entry.completed++;
        else entry.pending++;
        homeworkByStudent.set(hs.studentId, entry);
    }

    // 4. Recent marks — last 5 exams per student
    const marks = await prisma.mark.findMany({
        where: { studentId: { in: studentIds } },
        include: {
            exam: {
                select: {
                    name: true,
                    examDate: true,
                    maxMarks: true,
                    subject: { select: { name: true } },
                },
            },
        },
        orderBy: { exam: { examDate: 'desc' } },
    });

    const marksByStudent = new Map<string, typeof marks>();
    for (const m of marks) {
        const arr = marksByStudent.get(m.studentId) ?? [];
        arr.push(m);
        marksByStudent.set(m.studentId, arr);
    }

    // 5. Assemble the response — one entry per linked child
    const result = links.map((link) => {
        const sid = link.student.id;
        const att = attendanceByStudent.get(sid) ?? { total: 0, present: 0, absent: 0 };
        const hw = homeworkByStudent.get(sid) ?? { total: 0, completed: 0, pending: 0 };
        const studentMarks = (marksByStudent.get(sid) ?? []).slice(0, 5).map((m) => ({
            examName: m.exam.name,
            subject: m.exam.subject.name,
            obtained: m.marksObtained,
            maxMarks: m.exam.maxMarks,
            date: m.exam.examDate,
        }));

        return {
            student: link.student,
            attendance: {
                ...att,
                percentage: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
            },
            homework: hw,
            marks: studentMarks,
        };
    });

    return NextResponse.json(result);
});
