import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'teacher' | 'student' | 'parent';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export interface TokenPayload {
  sub: string; // user id
  instituteId: string;
  role: Role;
  jti?: string;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production!');
    }
    return 'prabodha-dev-fallback-secret-minimum-32-chars-key';
  }
  return secret;
}

export function signToken(payload: Omit<TokenPayload, 'jti' | 'exp'> & { jti?: string }): string {
  const tokenPayload: TokenPayload = {
    ...payload,
    jti: payload.jti || crypto.randomUUID(),
  };

  return jwt.sign(tokenPayload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}
