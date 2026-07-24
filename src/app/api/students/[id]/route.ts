import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const safeSelect = {
    id: true,
    instituteId: true,
    role: true,
    name: true,
    email: true,
    phone: true,
    dateOfBirth: true,
    address: true,
    parentName: true,
    enrollmentDate: true,
    batchId: true,
    isActive: true,
    createdAt: true,
};

async function findStudent(id: string, instituteId: string) {
    return prisma.user.findFirst({
        where: { id, instituteId, role: 'student' },
        select: safeSelect,
    });
}

/** Teacher-scoped access check: can this teacher see this student's batch? */
async function teacherCanAccessBatch(teacherId: string, instituteId: string, batchId: string | null) {
    if (!batchId) return false;
    const assignment = await prisma.batchSubjectTeacher.findFirst({
        where: { teacherId, instituteId, batchId },
    });
    return !!assignment;
}

export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    const id = params.id;

    const student = await findStudent(id, user.instituteId);
    if (!student) throw new ApiError(404, 'Student not found');

    if (user.role === 'teacher') {
        const allowed = await teacherCanAccessBatch(user.id, user.instituteId, student.batchId);
        if (!allowed) throw new ApiError(403, 'You do not have permission to do this');
    } else {
        requireRole(user, 'admin');
    }

    return NextResponse.json(student);
});

const patchSchema = z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    phone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
    parentName: z.string().optional(),
    batchId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const body = patchSchema.parse(await request.json());

    const existing = await findStudent(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Student not found');

    const student = await prisma.user.update({
        where: { id },
        data: {
            ...body,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        },
        select: safeSelect,
    });

    return NextResponse.json(student);
});

// Soft-delete: flips isActive to false instead of removing the row, so
// historical references (attendance records, homework status, parent links)
// stay intact.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const existing = await findStudent(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Student not found');

    const student = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: safeSelect,
    });

    return NextResponse.json(student);
});