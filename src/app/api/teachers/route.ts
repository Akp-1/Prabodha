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
    qualification: true,
    experienceYears: true,
    isActive: true,
    createdAt: true,
};

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    const teachers = await prisma.user.findMany({
        where: {
            instituteId: user.instituteId,
            role: 'teacher',
            ...(includeInactive ? {} : { isActive: true }),
        },
        select: safeSelect,
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(teachers);
});

const postSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    qualification: z.string().optional(),
    experienceYears: z.number().int().nonnegative().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const passwordHash = await hashPassword(body.password);

    const teacher = await prisma.user.create({
        data: {
            instituteId: user.instituteId,
            role: 'teacher',
            name: body.name,
            email: body.email.toLowerCase(),
            phone: body.phone,
            passwordHash,
            qualification: body.qualification,
            experienceYears: body.experienceYears,
        },
        select: safeSelect,
    });

    return NextResponse.json(teacher, { status: 201 });
});