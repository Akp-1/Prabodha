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

/** batch/subject pairs this teacher is actually assigned to teach. */
async function teacherBatchSubjectPairs(teacherId: string, instituteId: string) {
    const assignments = await prisma.batchSubjectTeacher.findMany({
        where: { teacherId, instituteId },
        select: { batchId: true, subjectId: true },
    });
    return assignments;
}

export const GET = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const batchId = request.nextUrl.searchParams.get('batchId') || undefined;
    const subjectId = request.nextUrl.searchParams.get('subjectId') || undefined;

    let scopeFilter = {};
    if (user.role === 'teacher') {
        const pairs = await teacherBatchSubjectPairs(user.sub, user.instituteId);
        // A teacher sees material for any batch/subject combo they're assigned
        // to teach, not just what they personally uploaded.
        scopeFilter = {
            OR: pairs.length
                ? pairs.map((p) => ({ batchId: p.batchId, subjectId: p.subjectId }))
                : [{ id: '__none__' }], // no assignments → no results, instead of an unfiltered query
        };
    }

    const materials = await prisma.studyMaterial.findMany({
        where: {
            instituteId: user.instituteId,
            ...(batchId ? { batchId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...scopeFilter,
        },
        include,
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(materials);
});

const postSchema = z
    .object({
        batchId: z.string().min(1),
        subjectId: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        materialType: z.enum(['pdf', 'image', 'note', 'link']),
        fileUrl: z.string().optional(),
        filePath: z.string().optional(),
        externalLink: z.string().url().optional(),
    })
    .refine((b) => (b.materialType === 'link' ? !!b.externalLink : !!(b.fileUrl || b.filePath)), {
        message: 'link materials require externalLink; other types require fileUrl or filePath',
    });

export const POST = apiHandler(async (request: NextRequest) => {
    const user = requireAuth(request);
    requireRole(user, 'admin', 'teacher');

    const body = postSchema.parse(await request.json());

    const [batch, subject] = await Promise.all([
        prisma.batch.findFirst({ where: { id: body.batchId, instituteId: user.instituteId } }),
        prisma.subject.findFirst({ where: { id: body.subjectId, instituteId: user.instituteId } }),
    ]);
    if (!batch) throw new ApiError(404, 'Batch not found');
    if (!subject) throw new ApiError(404, 'Subject not found');

    if (user.role === 'teacher') {
        const assigned = await prisma.batchSubjectTeacher.findFirst({
            where: { teacherId: user.sub, instituteId: user.instituteId, batchId: body.batchId, subjectId: body.subjectId },
        });
        if (!assigned) throw new ApiError(403, 'You are not assigned to teach this subject for this batch');
    }

    const material = await prisma.studyMaterial.create({
        data: {
            instituteId: user.instituteId,
            batchId: body.batchId,
            subjectId: body.subjectId,
            uploadedBy: user.sub,
            title: body.title,
            description: body.description,
            materialType: body.materialType,
            fileUrl: body.fileUrl,
            filePath: body.filePath,
            externalLink: body.externalLink,
        },
        include,
    });

    return NextResponse.json(material, { status: 201 });
});