import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiHandler, requireAuth, ApiError } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/** Used by the frontend on page load to check "is anyone logged in." */
export const GET = apiHandler(async (request: NextRequest) => {
  const authUser = requireAuth(request);

  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    include: { institute: true },
  });
  if (!user) throw new ApiError(404, 'User not found');

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    institute: { id: user.institute.id, name: user.institute.name, slug: user.institute.slug },
  });
});
