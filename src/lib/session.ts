import crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  email: string;
  role: 'user' | 'staff' | 'admin';
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'affy_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Use AFFY_SESSION_SECRET or a fallback derived from existing environment configuration
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
export function createSessionToken(user: { id: string; email: string; role?: 'user' | 'staff' | 'admin' }): string {
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
