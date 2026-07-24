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

// TimetableSlot.startTime/endTime are stored as DateTime (SQLite has no
// time-only column type). We only ever care about the time-of-day, so every
// slot is pinned to the same arbitrary reference date (1970-01-01) and
// compared/sorted on that basis.
const TIME_REF_DATE = '1970-01-01';

function parseTime(hhmm: string): Date {
    const date = new Date(`${TIME_REF_DATE}T${hhmm}:00.000Z`);
    if (isNaN(date.getTime())) throw new ApiError(400, `Invalid time "${hhmm}", expected HH:MM`);
    return date;
}

function formatTime(date: Date): string {
    return date.toISOString().slice(11, 16); // "HH:MM"
}

function serialize(slot: { startTime: Date; endTime: Date } & Record<string, unknown>) {
    return { ...slot, startTime: formatTime(slot.startTime), endTime: formatTime(slot.endTime) };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && bStart < aEnd;
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const dayOfWeekParam = request.nextUrl.searchParams.get('dayOfWeek');
    const dayOfWeek = dayOfWeekParam !== null ? Number(dayOfWeekParam) : undefined;

    const slots = await prisma.timetableSlot.findMany({
        where: {
            instituteId: user.instituteId,
            ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
            bst: {
                ...(batchId ? { batchId } : {}),
                // Teachers only ever see their own schedule; admins see everything
                // (optionally still narrowed by ?batchId=).
                ...(user.role === 'teacher' ? { teacherId: user.sub } : {}),
            },
        },
        include,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(slots.map(serialize));
});

const postSchema = z.object({
    batchSubjectTeacherId: z.string().min(1),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Expected HH:MM'),
    classroom: z.string().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const bst = await prisma.batchSubjectTeacher.findFirst({
        where: { id: body.batchSubjectTeacherId, instituteId: user.instituteId },
    });
    if (!bst) throw new ApiError(404, 'Assignment (batch/subject/teacher) not found');

    const startTime = parseTime(body.startTime);
    const endTime = parseTime(body.endTime);
    if (startTime >= endTime) throw new ApiError(400, 'startTime must be before endTime');

    // Conflict checks — a slot can't double-book the same teacher, the same
    // batch, or (if given) the same classroom, on the same day at an
    // overlapping time. We fetch same-day slots for the institute and check
    // overlap in JS since SQLite has no native time-range overlap query.
    const sameDaySlots = await prisma.timetableSlot.findMany({
        where: { instituteId: user.instituteId, dayOfWeek: body.dayOfWeek },
        include: { bst: { select: { teacherId: true, batchId: true } } },
    });

    for (const slot of sameDaySlots) {
        if (!overlaps(startTime, endTime, slot.startTime, slot.endTime)) continue;
        if (slot.bst.teacherId === bst.teacherId) {
            throw new ApiError(409, 'This teacher already has an overlapping class at this time');
        }
        if (slot.bst.batchId === bst.batchId) {
            throw new ApiError(409, 'This batch already has an overlapping class at this time');
        }
        if (body.classroom && slot.classroom === body.classroom) {
            throw new ApiError(409, 'This classroom is already booked at an overlapping time');
        }
    }

    const created = await prisma.timetableSlot.create({
        data: {
            instituteId: user.instituteId,
            batchSubjectTeacherId: body.batchSubjectTeacherId,
            dayOfWeek: body.dayOfWeek,
            startTime,
            endTime,
            classroom: body.classroom,
        },
        include,
    });

    return NextResponse.json(serialize(created), { status: 201 });
});