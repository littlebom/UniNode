export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - api/auth (NextAuth routes)
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
