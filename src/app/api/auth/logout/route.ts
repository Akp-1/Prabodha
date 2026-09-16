import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, requireAuth } from '@/lib/rbac';
import { revokeToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Revokes the current JWT on the server so it cannot be reused,
 * and confirms logout for the client.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request, { allowInactive: true });
  if (user.jti) {
    revokeToken(user.jti, user.exp);
  }
  return NextResponse.json({ message: 'Logged out' });
});
