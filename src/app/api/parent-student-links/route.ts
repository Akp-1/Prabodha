import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const parentId = request.nextUrl.searchParams.get('parentId') || undefined;
    const studentId = request.nextUrl.searchParams.get('studentId') || undefined;

    const links = await prisma.parentStudentLink.findMany({
        where: {
            instituteId: user.instituteId,
            ...(parentId ? { parentId } : {}),
            ...(studentId ? { studentId } : {}),
        },
        include: {
            parent: { select: { id: true, name: true, email: true } },
            student: { select: { id: true, name: true, email: true, batchId: true } },
        },
        orderBy: { parent: { name: 'asc' } },
    });

    return NextResponse.json(links);
});

const postSchema = z.object({
    parentId: z.string().min(1, 'parentId is required'),
    studentId: z.string().min(1, 'studentId is required'),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    // Validate both users exist in this institute with the correct roles
    const [parent, student] = await Promise.all([
        prisma.user.findFirst({
            where: { id: body.parentId, instituteId: user.instituteId, role: 'parent' },
            select: { id: true },
        }),
        prisma.user.findFirst({
            where: { id: body.studentId, instituteId: user.instituteId, role: 'student' },
            select: { id: true },
        }),
    ]);

    if (!parent) {
        throw new ApiError(400, 'Parent not found in this institute');
    }
    if (!student) {
        throw new ApiError(400, 'Student not found in this institute');
    }

    // Prisma @@unique([parentId, studentId]) handles duplicate → P2002 → 409
    const link = await prisma.parentStudentLink.create({
        data: {
            instituteId: user.instituteId,
            parentId: body.parentId,
            studentId: body.studentId,
        },
        include: {
            parent: { select: { id: true, name: true, email: true } },
            student: { select: { id: true, name: true, email: true, batchId: true } },
        },
    });

    return NextResponse.json(link, { status: 201 });
});
