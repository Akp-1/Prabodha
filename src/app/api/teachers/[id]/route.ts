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
    qualification: true,
    experienceYears: true,
    isActive: true,
    createdAt: true,
};

async function findTeacher(id: string, instituteId: string) {
    return prisma.user.findFirst({
        where: { id, instituteId, role: 'teacher' },
        select: safeSelect,
    });
}

export const GET = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    const id = context?.params?.id || '';

    const teacher = await findTeacher(id, user.instituteId);
    if (!teacher) throw new ApiError(404, 'Teacher not found');

    return NextResponse.json(teacher);
});

const patchSchema = z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    phone: z.string().optional(),
    qualification: z.string().optional(),
    experienceYears: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = context?.params?.id || '';

    const body = patchSchema.parse(await request.json());

    const existing = await findTeacher(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Teacher not found');

    const teacher = await prisma.user.update({
        where: { id },
        data: body,
        select: safeSelect,
    });

    return NextResponse.json(teacher);
});

// Soft-delete: flips isActive to false instead of removing the row, so
// historical references (attendance marked_by, homework assigned_by,
// batch/subject assignments) stay intact.
export const DELETE = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = context?.params?.id || '';

    const existing = await findTeacher(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Teacher not found');

    const teacher = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: safeSelect,
    });

    return NextResponse.json(teacher);
});