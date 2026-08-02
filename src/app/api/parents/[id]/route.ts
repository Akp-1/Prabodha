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
    isActive: true,
    createdAt: true,
    parentLinksAsParent: {
        select: {
            id: true,
            student: {
                select: { id: true, name: true, email: true, batchId: true },
            },
        },
    },
};

async function findParent(id: string, instituteId: string) {
    return prisma.user.findFirst({
        where: { id, instituteId, role: 'parent' },
        select: safeSelect,
    });
}

export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const parent = await findParent(id, user.instituteId);
    if (!parent) throw new ApiError(404, 'Parent not found');

    return NextResponse.json(parent);
});

const patchSchema = z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const body = patchSchema.parse(await request.json());

    const existing = await findParent(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Parent not found');

    const parent = await prisma.user.update({
        where: { id },
        data: body,
        select: safeSelect,
    });

    return NextResponse.json(parent);
});

// Soft-delete: flips isActive to false. The parent's links remain intact
// so historical data (homework status views etc.) stays consistent.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const existing = await findParent(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Parent not found');

    const parent = await prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: safeSelect,
    });

    return NextResponse.json(parent);
});
