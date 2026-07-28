import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';
import { canReadContent, canWriteContent } from '@/lib/content-scope';

export const dynamic = 'force-dynamic';

const fullInclude = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    creator: { select: { id: true, name: true } },
    marks: { include: { student: { select: { id: true, name: true } } } },
};

async function findExam(id: string, instituteId: string) {
    return prisma.exam.findFirst({ where: { id, instituteId }, include: fullInclude });
}

 export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student');
    const id = params.id;

    const exam = await findExam(id, user.instituteId);
    if (!exam) throw new ApiError(404, 'Exam not found');
    if (!(await canReadContent(user, exam.batchId, exam.subjectId))) {
        throw new ApiError(403, 'You do not have permission to do this');
    }

    if (user.role === 'student') {
        // Never expose a classmate's score or name in the detail response.
        const mine = exam.marks.find((m) => m.student.id === user.sub) ?? null;
        return NextResponse.json({ ...exam, marks: mine ? [mine] : [], myMark: mine });
    }

    return NextResponse.json(exam);
});

// batchId/subjectId aren't editable — that's the exam's identity, same
// reasoning as every other content resource in this codebase. Unlike
// Attendance/Homework, marks aren't pre-created per student at Exam
// creation time (there's no fixed roster snapshot to correct) — so `marks`
// here is an upsert: entering a grade for a student for the first time and
// correcting an existing one use the same array.
const patchSchema = z.object({
    name: z.string().min(1).optional(),
    examDate: z
        .string()
        .refine((d) => !isNaN(new Date(d).getTime()), 'Invalid examDate')
        .optional(),
    maxMarks: z.number().positive().optional(),
    marks: z
        .array(
            z.object({
                studentId: z.string().min(1),
                marksObtained: z.number().min(0),
                remarks: z.string().optional(),
            })
        )
        .optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const body = patchSchema.parse(await request.json());

    const existing = await findExam(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Exam not found');
    if (!canWriteContent(user, existing.createdBy)) {
        throw new ApiError(403, 'You do not have permission to do this');
    }

    const maxMarks = body.maxMarks ?? existing.maxMarks;

    if (body.marks?.length) {
        const studentIds = body.marks.map((m) => m.studentId);
        if (new Set(studentIds).size !== studentIds.length) {
            throw new ApiError(400, 'Duplicate studentId in marks');
        }

        const students = await prisma.user.findMany({
            where: { id: { in: studentIds }, instituteId: user.instituteId, role: 'student', batchId: existing.batchId },
        });
        if (students.length !== studentIds.length) {
            throw new ApiError(400, "One or more students do not belong to this exam's batch");
        }

        for (const m of body.marks) {
            if (m.marksObtained > maxMarks) {
                throw new ApiError(400, `marksObtained (${m.marksObtained}) cannot exceed maxMarks (${maxMarks})`);
            }
        }

        await prisma.$transaction(
            body.marks.map((m) =>
                prisma.mark.upsert({
                    where: { examId_studentId: { examId: id, studentId: m.studentId } },
                    create: { examId: id, studentId: m.studentId, marksObtained: m.marksObtained, remarks: m.remarks },
                    update: { marksObtained: m.marksObtained, remarks: m.remarks },
                })
            )
        );
    } else if (body.maxMarks !== undefined) {
        // Lowering maxMarks below an already-recorded score would silently
        // invalidate that score, so it's rejected rather than truncated.
        const tooHigh = existing.marks.find((m) => m.marksObtained > maxMarks);
        if (tooHigh) {
            throw new ApiError(
                400,
                `Cannot set maxMarks below an existing score (${tooHigh.marksObtained}) — correct or remove that mark first`
            );
        }
    }

    const { marks, ...examFields } = body;
    const exam = await prisma.exam.update({
        where: { id },
        data: {
            ...examFields,
            examDate: examFields.examDate ? new Date(examFields.examDate) : undefined,
        },
        include: fullInclude,
    });

    return NextResponse.json(exam);
});

// Hard delete — cascades to Mark rows.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const existing = await findExam(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Exam not found');
    if (!canWriteContent(user, existing.createdBy)) {
        throw new ApiError(403, 'You do not have permission to do this');
    }

    await prisma.exam.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});