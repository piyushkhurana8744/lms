import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/platform') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/sessions') ||
    pathname.startsWith('/notifications');

  // 1. Redirect unauthenticated users away from protected routes
  // A missing/expired access cookie can be recovered by AuthProvider from the
  // HttpOnly refresh cookie. Only redirect when neither credential exists.
  if (isProtectedRoute && !accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/platform', '/platform/:path*', '/instructor/:path*', '/student/:path*', '/notifications/:path*', '/profile', '/sessions', '/login', '/register', '/forgot-password']
};
