import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, type Role } from './auth';
import { isTokenRevoked, getUserActiveStatus } from './session';

/**
 * Thrown by requireAuth/requireRole and caught by apiHandler below. Lets
 * route handlers just `throw new ApiError(403, "...")` instead of manually
 * building a NextResponse at every failure point.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Reads and verifies the Authorization: Bearer <token> header.
 * Validates cryptographic signature, checks token revocation blocklist,
 * and validates that the user account exists and isActive === true.
 */
export async function requireAuth(
  request: NextRequest,
  options?: { allowInactive?: boolean }
): Promise<TokenPayload> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Missing or invalid Authorization header');
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // 1. Check if token was revoked (e.g. logged out)
  if (isTokenRevoked(payload.jti)) {
    throw new ApiError(401, 'Token has been revoked');
  }

  // 2. Validate user active status via high-speed cache with DB fallback
  const userStatus = await getUserActiveStatus(payload.sub, payload.instituteId);
  if (!userStatus) {
    throw new ApiError(401, 'User account not found');
  }

  if (!options?.allowInactive && !userStatus.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }

  payload.role = userStatus.role as Role;
  return payload;
}

/** Equivalent of the Express requireRole('admin') etc. */
export function requireRole(user: TokenPayload, ...allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to do this');
  }
}

/**
 * Wraps a route handler so it can just `throw new ApiError(...)` (or let a
 * Prisma/unexpected error bubble up) instead of every handler needing its
 * own try/catch. Usage:
 *
 *   export const POST = apiHandler(async (request) => {
 *     const user = requireAuth(request);
 *     ...
 *     return NextResponse.json({ ... }, { status: 201 });
 *   });
 */
export function apiHandler(
  handler: (request: NextRequest, context: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      const safeContext = context && context.params ? context : { params: {} };
      return await handler(request, safeContext);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      // Prisma unique constraint violation
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
        return NextResponse.json({ error: 'A record with these details already exists' }, { status: 409 });
      }
      console.error(err);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}
