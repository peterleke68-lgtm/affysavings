import crypto from 'crypto';
import { NextRequest } from 'next/server';

export type UserRole =
  | 'user'
  | 'Super Admin'
  | 'Finance'
  | 'Operations'
  | 'Customer Support'
  | 'Compliance'
  | 'Content Manager'
  | 'admin'
  | 'staff';

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'affy_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const SESSION_SECRET =
  process.env.AFFY_SESSION_SECRET ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'affy-savings-default-production-secure-session-key-2026';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed session token.
 */
export function createSessionToken(user: { id: string; email: string; role?: UserRole }): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    role: user.role || 'user',
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 * Returns null if invalid or expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Constructs a Set-Cookie header value for establishing the session.
 */
export function buildSessionCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `Max-Age=${SESSION_MAX_AGE}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];

  if (isProduction) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

/**
 * Constructs a Set-Cookie header value for clearing the session.
 */
export function buildClearSessionCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `Max-Age=0`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];

  if (isProduction) {
    cookieOptions.push('Secure');
  }

  return cookieOptions.join('; ');
}

/**
 * Parses the session token from a Cookie header string.
 */
export function extractSessionTokenFromCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name === SESSION_COOKIE_NAME) {
      return valueParts.join('=');
    }
  }
  return null;
}

/**
 * Extracts and verifies the session from an incoming Next.js request.
 */
export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  const cookieHeader = request.headers.get('cookie');
  const token = extractSessionTokenFromCookie(cookieHeader);
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Helper to enforce that a request has an authenticated session.
 */
export function requireAuthenticatedUser(request: NextRequest): { authenticated: true; session: SessionPayload } | { authenticated: false; error: string; status: number } {
  const session = getSessionFromRequest(request);
  if (!session) {
    return { authenticated: false, error: 'Unauthorized. Please sign in to continue.', status: 401 };
  }
  return { authenticated: true, session };
}

/**
 * Helper to enforce role-based access control.
 */
export function requireStaffRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): { authorized: true; session: SessionPayload } | { authorized: false; error: string; status: number } {
  const authCheck = requireAuthenticatedUser(request);
  if (!authCheck.authenticated) {
    return { authorized: false, error: authCheck.error, status: authCheck.status };
  }

  const { session } = authCheck;
  // Super Admin always has full access
  if (session.role === 'Super Admin' || allowedRoles.includes(session.role)) {
    return { authorized: true, session };
  }

  return {
    authorized: false,
    error: `Forbidden. This operation requires one of the following roles: ${allowedRoles.join(', ')}.`,
    status: 403,
  };
}
