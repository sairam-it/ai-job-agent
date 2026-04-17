// middleware.js
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

const PROTECTED_ROUTES = ['/upload', '/companies', '/jobs']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Manual session cookie (email/OTP/synced OAuth logins) ──
  // Set by auth/page.js after email login or by page.js after OAuth sync.
  // Session cookie — no maxAge — dies when browser closes.
  const manualSession = request.cookies.get('aija_has_session')?.value === 'true'

  // ── NextAuth JWT (exists during OAuth callback window) ────
  // Checked separately so we can distinguish OAuth-in-progress
  // from a fully-synced session.
  const nextAuthToken = await getToken({
    req   : request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // A session is "fully ready" when our manual cookie is set.
  // A session is "partially ready" when only NextAuth JWT exists
  // (OAuth just completed but page.js hasn't synced yet).
  const fullyAuthenticated  = manualSession
  const partiallyAuth       = !!nextAuthToken && !manualSession

  // ── Protect app routes ────────────────────────────────────
  // Require either signal for protected pages.
  const isProtected = PROTECTED_ROUTES.some(r =>
    pathname === r || pathname.startsWith(r + '/')
  )
  if (isProtected && !fullyAuthenticated && !partiallyAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    if (pathname !== '/') url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // ── Protect home page ─────────────────────────────────────
  // Unauthenticated users visiting / are redirected to /auth.
  if (pathname === '/' && !fullyAuthenticated && !partiallyAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // ── Redirect authenticated users away from /auth ──────────
  // ONLY redirect if manual cookie is set (fully synced session).
  // Do NOT redirect if only NextAuth JWT exists — that means OAuth
  // just completed and page.js needs to run the sync first.
  if (pathname.startsWith('/auth') && fullyAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}