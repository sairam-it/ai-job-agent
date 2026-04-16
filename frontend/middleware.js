// middleware.js (place at: frontend/middleware.js — same level as app/)
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/upload', '/companies', '/jobs']

// Routes that logged-in users should not see
const AUTH_ROUTES = ['/auth']

export async function middleware(request) {
const { pathname } = request.nextUrl

// ── Check NextAuth JWT token (session cookie) ────────
const nextAuthToken = await getToken({
req : request,
secret: process.env.NEXTAUTH_SECRET,
})

// ── Also check our custom sessionStorage token ────────
// sessionStorage isn't accessible server-side, so we use
// a cookie we set manually from the frontend after OTP/password login.
// The cookie is set in auth/page.js after successful signin.
const customSessionCookie = request.cookies.get('aija_has_session')?.value

const isAuthenticated = !!nextAuthToken || customSessionCookie === 'true'

const isProtectedRoute = PROTECTED_ROUTES.some(route =>
pathname.startsWith(route)
)

const isAuthRoute = AUTH_ROUTES.some(route =>
pathname.startsWith(route)
)

// ── Redirect unauthenticated users to /auth ──────────
if (isProtectedRoute && !isAuthenticated) {
const url = request.nextUrl.clone()
url.pathname = '/auth'
url.searchParams.set('from', pathname) // remember where they came from
return NextResponse.redirect(url)
}

// ── Task 1: Protect the home page too ────────────────
// If someone navigates to / with no session, redirect to /auth
if (pathname === '/' && !isAuthenticated) {
const url = request.nextUrl.clone()
url.pathname = '/auth'
return NextResponse.redirect(url)
}

return NextResponse.next()
}

export const config = {
// Run middleware on these paths only — skip static files, API routes
matcher: [
'/((?!_next/static|_next/image|favicon.ico|api/).*)',
],
}