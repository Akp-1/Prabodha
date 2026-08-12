import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// Hard delete — a parent-student link is structural, not a person.
export const DELETE = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin');
    const id = context?.params?.id || '';

    const link = await prisma.parentStudentLink.findFirst({
        where: { id, instituteId: user.instituteId },
    });
    if (!link) throw new ApiError(404, 'Link not found');

    await prisma.parentStudentLink.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});
