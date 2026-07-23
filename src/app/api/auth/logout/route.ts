import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, requireAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * JWTs are stateless, so "logout" just confirms the token was valid — the
 * frontend deletes its stored token on this call. Kept as a real endpoint
 * so the client has something consistent to call rather than special-casing
 * logout as a local-only action.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  requireAuth(request);
  return NextResponse.json({ message: 'Logged out' });
});
