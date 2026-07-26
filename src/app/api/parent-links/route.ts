import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    parent: { select: { id: true, name: true, email: true } },
    student: { select: { id: true, name: true, batchId: true } },
};

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);

    const studentId = request.nextUrl.searchParams.get('studentId') || undefined;
    const parentId = request.nextUrl.searchParams.get('parentId') || undefined;

    // Admins can see and filter every link in the institute. A parent or
    // student can only ever see their own links — the query params above are
    // ignored for them, same "can't probe someone else's data by passing a
    // different id" pattern used elsewhere (e.g. Assignments).
    let selfScope = {};
    if (user.role === 'parent') selfScope = { parentId: user.sub };
    else if (user.role === 'student') selfScope = { studentId: user.sub };
    else requireRole(user, 'admin');

    const links = await prisma.parentStudentLink.findMany({
        where: {
            instituteId: user.instituteId,
            ...(user.role === 'admin' ? { ...(studentId ? { studentId } : {}), ...(parentId ? { parentId } : {}) } : {}),
            ...selfScope,
        },
        include,
    });

    return NextResponse.json(links);
});

const postSchema = z.object({
    parentId: z.string().min(1),
    studentId: z.string().min(1),
});

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');

    const body = postSchema.parse(await request.json());

    const [parent, student] = await Promise.all([
        prisma.user.findFirst({ where: { id: body.parentId, instituteId: user.instituteId, role: 'parent' } }),
        prisma.user.findFirst({ where: { id: body.studentId, instituteId: user.instituteId, role: 'student' } }),
    ]);
    if (!parent) throw new ApiError(404, 'Parent not found');
    if (!student) throw new ApiError(404, 'Student not found');

    // Unique constraint on [parentId, studentId] means re-linking the same
    // pair hits P2002 → 409 via apiHandler, same pattern as Assignments.
    const link = await prisma.parentStudentLink.create({
        data: {
            instituteId: user.instituteId,
            parentId: body.parentId,
            studentId: body.studentId,
        },
        include,
    });

    return NextResponse.json(link, { status: 201 });
});