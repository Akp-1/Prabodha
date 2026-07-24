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
    dateOfBirth: true,
    address: true,
    parentName: true,
    enrollmentDate: true,
    batchId: true,
    isActive: true,
    createdAt: true,
};

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';
    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;

    // Admins see every student in the institute. Teachers only see students
    // in batches they're actually assigned to teach (legacy teacher-scoped
    // student access), regardless of which batch they ask for.
    let batchFilter: { in: string[] } | string | undefined = batchId;
    if (user.role === 'teacher') {
        const assignments = await prisma.batchSubjectTeacher.findMany({
            where: { teacherId: user.sub, instituteId: user.instituteId },
            select: { batchId: true },
            distinct: ['batchId'],
        });
        const assignedBatchIds = assignments.map((a) => a.batchId);
        batchFilter = batchId
            ? assignedBatchIds.includes(batchId)
                ? batchId
                : { in: [] } // asked for a batch they don't teach — return nothing, not an error
            : { in: assignedBatchIds };
    } else {
        requireRole(user, 'admin');
    }

    const students = await prisma.user.findMany({
        where: {
            instituteId: user.instituteId,
            role: 'student',
            ...(includeInactive ? {} : { isActive: true }),
            ...(batchFilter !== undefined ? { batchId: batchFilter } : {}),
        },
        select: safeSelect,
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(students);
});

const postSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    dateOfBirth: z.string().datetime().optional(),
    address: z.string().optional(),
    parentName: z.string().optional(),
    batchId: z.string().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const passwordHash = await hashPassword(body.password);

    const student = await prisma.user.create({
        data: {
            instituteId: user.instituteId,
            role: 'student',
            name: body.name,
            email: body.email.toLowerCase(),
            phone: body.phone,
            passwordHash,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
            address: body.address,
            parentName: body.parentName,
            batchId: body.batchId,
        },
        select: safeSelect,
    });

    return NextResponse.json(student, { status: 201 });
});