import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/rbac';

/**
 * Shared helpers for the "teacher-authored content" access pattern used by
 * Study Material, Homework, and Marks: a teacher can only create content for
 * a batch/subject they're currently assigned to teach (via
 * BatchSubjectTeacher), but once created, editing/deleting it follows
 * ownership (whoever authored it) rather than the current assignment — so
 * being reassigned doesn't retroactively lock a teacher out of their own work.
 *
 * Extracted here because this exact pattern was being hand-rolled (with
 * small inconsistencies) in materials/route.ts, homework/route.ts, and their
 * [id] counterparts. New teacher-scoped resources should use this instead of
 * re-deriving it.
 */

export type CurrentUser = { sub: string; instituteId: string; role: string };

/** Every { batchId, subjectId } pair this teacher is currently assigned to teach. */
export async function teacherAssignedPairs(teacherId: string, instituteId: string) {
    return prisma.batchSubjectTeacher.findMany({
        where: { teacherId, instituteId },
        select: { batchId: true, subjectId: true },
    });
}

/**
 * A Prisma `where` fragment scoping a query to only the batch/subject pairs
 * a teacher currently teaches. Admins get `{}` (unscoped). Returns an
 * always-false filter for a teacher with zero assignments, rather than an
 * accidentally-unfiltered query.
 */
export async function teacherContentScope(user: CurrentUser) {
    if (user.role !== 'teacher') return {};
    const pairs = await teacherAssignedPairs(user.sub, user.instituteId);
    return {
        OR: pairs.length ? pairs.map((p) => ({ batchId: p.batchId, subjectId: p.subjectId })) : [{ id: '__none__' }],
    };
}

/** Throws 403 unless the user is an admin or is currently assigned to teach this exact batch+subject. */
export async function requireCurrentlyAssigned(user: CurrentUser, batchId: string, subjectId: string) {
    if (user.role === 'admin') return;
    const assigned = await prisma.batchSubjectTeacher.findFirst({
        where: { teacherId: user.sub, instituteId: user.instituteId, batchId, subjectId },
    });
    if (!assigned) throw new ApiError(403, 'You are not assigned to teach this subject for this batch');
}

/** Read access: admin, or currently assigned to the content's batch/subject. */
export async function canReadContent(user: CurrentUser, batchId: string, subjectId: string): Promise<boolean> {
    if (user.role === 'admin') return true;
    const assigned = await prisma.batchSubjectTeacher.findFirst({
        where: { teacherId: user.sub, instituteId: user.instituteId, batchId, subjectId },
    });
    return !!assigned;
}

/** Write access: admin, or the original author — persists even after reassignment. */
export function canWriteContent(user: CurrentUser, ownerId: string): boolean {
    return user.role === 'admin' || ownerId === user.sub;
}