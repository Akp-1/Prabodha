import { PrismaClient } from '@prisma/client';

// In dev, Next.js hot-reloads modules, which would otherwise create a new
// PrismaClient (and a new DB connection) on every file save. Stashing it on
// `globalThis` keeps one instance alive across reloads. This whole guard is
// a no-op in production, where there's no hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
