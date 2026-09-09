import { NextResponse } from 'next/server';
import { buildClearSessionCookieHeader } from '@/lib/session';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    const clearCookieHeader = buildClearSessionCookieHeader();
    response.headers.set('Set-Cookie', clearCookieHeader);

    return response;
  } catch (err) {
    console.error('[Affy API] /api/auth/logout error:', err);
    return NextResponse.json({ success: false, error: 'Failed to log out.' }, { status: 500 });
  }
}
