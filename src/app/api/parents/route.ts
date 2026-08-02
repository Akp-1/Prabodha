import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { apiHandler, requireAuth, requireRole } from '@/lib/rbac';

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

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    const parents = await prisma.user.findMany({
        where: {
            instituteId: user.instituteId,
            role: 'parent',
            ...(includeInactive ? {} : { isActive: true }),
        },
        select: safeSelect,
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(parents);
});

const postSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const passwordHash = await hashPassword(body.password);

    const parent = await prisma.user.create({
        data: {
            instituteId: user.instituteId,
            role: 'parent',
            name: body.name,
            email: body.email.toLowerCase(),
            phone: body.phone,
            passwordHash,
        },
        select: safeSelect,
    });

    return NextResponse.json(parent, { status: 201 });
});
