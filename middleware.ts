import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// Public routes (no auth needed)
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow all API routes except protected staff management
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/staff')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await verifyToken(token);
  if (!user) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Patient can only access their own records
  if (user.role === 'patient') {
    const allowedForPatient = [
      `/patients/${user.patientId}`,
      `/patients/${user.patientId}/checkin`,
      `/patients/${user.patientId}/lab-upload`,
      `/patients/${user.patientId}/protocol`,
      '/my-records',
    ];
    const isAllowed = allowedForPatient.some(p => pathname.startsWith(p));
    if (!isAllowed) {
      return NextResponse.redirect(new URL(`/patients/${user.patientId}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
