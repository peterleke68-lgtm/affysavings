import { NextRequest, NextResponse } from 'next/server';
import { extractSessionTokenFromCookie, verifySessionToken } from '@/lib/session';
import { getUserById, getUserByEmail } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const token = extractSessionTokenFromCookie(cookieHeader);

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    // Lookup user by ID, fallback to email
    let user = await getUserById(payload.userId);
    if (!user) {
      user = await getUserByEmail(payload.email);
    }

    if (!user) {
      // User was deleted or not found
      return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err) {
    console.error('[Affy API] /api/auth/me error:', err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
