import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, requireRole, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const include = {
    batch: { select: { id: true, name: true } },
    subject: { select: { id: true, name: true } },
    uploader: { select: { id: true, name: true } },
};

async function findMaterial(id: string, instituteId: string) {
    return prisma.studyMaterial.findFirst({ where: { id, instituteId }, include });
}

/** Admin, or the teacher who originally uploaded it — ownership persists even
 * if their batch/subject assignment later changes. */
function canWrite(user: { role: string; sub: string }, material: { uploadedBy: string }) {
    return user.role === 'admin' || material.uploadedBy === user.sub;
}

/** Read access follows the same current-assignment scoping as the list route.
 * A student may read any material for their own batch, regardless of subject. */
async function canRead(user: { role: string; sub: string; instituteId: string }, material: { batchId: string; subjectId: string }) {
    if (user.role === 'admin') return true;
    if (user.role === 'student') {
        const self = await prisma.user.findFirst({
            where: { id: user.sub, instituteId: user.instituteId, role: 'student' },
            select: { batchId: true },
        });
        return self?.batchId === material.batchId;
    }
    const assigned = await prisma.batchSubjectTeacher.findFirst({
        where: { teacherId: user.sub, instituteId: user.instituteId, batchId: material.batchId, subjectId: material.subjectId },
    });
    return !!assigned;
}

export const GET = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher', 'student');
    const id = context?.params?.id || '';

    const material = await findMaterial(id, user.instituteId);
    if (!material) throw new ApiError(404, 'Study material not found');

    if (!(await canRead(user, material))) throw new ApiError(403, 'You do not have permission to do this');

    return NextResponse.json(material);
});

const patchSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    fileUrl: z.string().nullable().optional(),
    filePath: z.string().nullable().optional(),
    externalLink: z.string().url().nullable().optional(),
});

export const PATCH = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = context?.params?.id || '';

    const body = patchSchema.parse(await request.json());

    const existing = await findMaterial(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Study material not found');
    if (!canWrite(user, existing)) throw new ApiError(403, 'You do not have permission to do this');

    const material = await prisma.studyMaterial.update({
        where: { id },
        data: body,
        include,
    });

    return NextResponse.json(material);
});

// Hard delete — no isActive concept for material, same as Timetable/Assignments.
export const DELETE = apiHandler(async (request: NextRequest, context) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');
    const id = context?.params?.id || '';

    const existing = await findMaterial(id, user.instituteId);
    if (!existing) throw new ApiError(404, 'Study material not found');
    if (!canWrite(user, existing)) throw new ApiError(403, 'You do not have permission to do this');

    await prisma.studyMaterial.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
});