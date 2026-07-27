import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    parent: { select: { id: true, name: true, email: true } },
    student: { select: { id: true, name: true, batchId: true } },
};

async function findLink(id: string, instituteId: string) {
    return prisma.parentStudentLink.findFirst({ where: { id, instituteId }, include });
}

function canAccess(user: { role: string; sub: string }, link: { parentId: string; studentId: string }) {
    if (user.role === 'admin') return true;
    if (user.role === 'parent') return link.parentId === user.sub;
    if (user.role === 'student') return link.studentId === user.sub;
    return false;
}

export const GET = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    const id = params.id;

    const link = await findLink(id, user.instituteId);
    if (!link) throw new ApiError(404, 'Parent-student link not found');
    if (!canAccess(user, link)) throw new ApiError(403, 'You do not have permission to do this');

    return NextResponse.json(link);
});

// No PATCH — parentId + studentId together are this row's entire identity;
// there's nothing else on it to edit. Changing either pair is delete + POST
// a new link, same reasoning as Assignments' batch/subject fields.

// Hard delete — a structural link, not a person, same as Assignments.
export const DELETE = apiHandler(async (request: NextRequest, { params }) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = params.id;

    const existing = await findLink(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Parent-student link not found');

    await prisma.parentStudentLink.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});