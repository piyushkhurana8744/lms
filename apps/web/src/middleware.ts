import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/sessions') ||
    pathname.startsWith('/notifications');

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password');

  // 1. Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect authenticated users away from login/register routes
  if (isAuthRoute && accessToken) {
    // If the user already has an active access token, redirect to dashboard resolver
    // Defaulting to root or client-side resolver rather than hardcoding /admin
    return NextResponse.redirect(new URL('/student', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/instructor/:path*', '/student/:path*', '/notifications/:path*', '/profile', '/sessions', '/login', '/register', '/forgot-password']
};
