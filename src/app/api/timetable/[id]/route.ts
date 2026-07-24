import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    bst: {
        include: {
            batch: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true, email: true } },
        },
    },
};

const TIME_REF_DATE = '1970-01-01';

function parseTime(hhmm: string): Date {
    const date = new Date(`${TIME_REF_DATE}T${hhmm}:00.000Z`);
    if (isNaN(date.getTime())) throw new ApiError(400, `Invalid time "${hhmm}", expected HH:MM`);
    return date;
}

function formatTime(date: Date): string {
    return date.toISOString().slice(11, 16);
}

function serialize(slot: { startTime: Date; endTime: Date } & Record<string, unknown>) {
    return { ...slot, startTime: formatTime(slot.startTime), endTime: formatTime(slot.endTime) };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && bStart < aEnd;
}

async function findSlot(id: string, instituteId: string) {
    return prisma.timetableSlot.findFirst({
        where: { id, instituteId },
        include: { bst: { select: { teacherId: true, batchId: true } } },
    });
}

export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = params.id;

    const slot = await prisma.timetableSlot.findFirst({
        where: { id, instituteId: user.instituteId },
        include,
    });
    if (!slot) throw new ApiError(404, 'Timetable slot not found');

    if (user.role === 'teacher' && slot.bst.teacher.id !== user.sub) {
        throw new ApiError(403, 'You do not have permission to do this');
    }

    return NextResponse.json(serialize(slot));
});

// batchSubjectTeacherId isn't editable here — that's the identity of what's
// being scheduled. Moving a class to a different teacher/batch/subject is
// really scheduling a different class, so it's delete + POST instead.
const patchSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM').optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM').optional(),
    classroom: z.string().nullable().optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const body = patchSchema.parse(await request.json());

    const existing = await findSlot(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Timetable slot not found');

    const dayOfWeek = body.dayOfWeek ?? existing.dayOfWeek;
    const startTime = body.startTime ? parseTime(body.startTime) : existing.startTime;
    const endTime = body.endTime ? parseTime(body.endTime) : existing.endTime;
    const classroom = body.classroom !== undefined ? body.classroom : existing.classroom;

    if (startTime >= endTime) throw new ApiError(400, 'startTime must be before endTime');

    const sameDaySlots = await prisma.timetableSlot.findMany({
        where: { instituteId: user.instituteId, dayOfWeek, id: { not: id } },
        include: { bst: { select: { teacherId: true, batchId: true } } },
    });

    for (const slot of sameDaySlots) {
        if (!overlaps(startTime, endTime, slot.startTime, slot.endTime)) continue;
        if (slot.bst.teacherId === existing.bst.teacherId) {
            throw new ApiError(409, 'This teacher already has an overlapping class at this time');
        }
        if (slot.bst.batchId === existing.bst.batchId) {
            throw new ApiError(409, 'This batch already has an overlapping class at this time');
        }
        if (classroom && slot.classroom === classroom) {
            throw new ApiError(409, 'This classroom is already booked at an overlapping time');
        }
    }

    const updated = await prisma.timetableSlot.update({
        where: { id },
        data: { dayOfWeek, startTime, endTime, classroom },
        include,
    });

    return NextResponse.json(serialize(updated));
});

// Hard delete — structural, like Assignments, not a person.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const existing = await findSlot(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Timetable slot not found');

    await prisma.timetableSlot.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});