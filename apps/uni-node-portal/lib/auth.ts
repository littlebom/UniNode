import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'

/**
 * NextAuth v5 configuration with Authentik OpenID Connect provider.
 *
 * Role mapping:
 * - Authentik group "unilink-admin"     → admin
 * - Authentik group "unilink-registrar" → registrar
 * - Default                              → viewer
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: 'admin' | 'registrar' | 'viewer'
      image?: string | null
    }
    accessToken?: string
  }

  interface User {
    role?: 'admin' | 'registrar' | 'viewer'
  }
}

// JWT token fields are typed via callback parameters
// next-auth v5 uses @auth/core/jwt internally

function mapGroupsToRole(groups: string[]): 'admin' | 'registrar' | 'viewer' {
  if (groups.includes('unilink-admin')) return 'admin'
  if (groups.includes('unilink-registrar')) return 'registrar'
  return 'viewer'
}

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: 'authentik',
      name: 'Authentik',
      type: 'oidc',
      issuer: process.env.AUTHENTIK_ISSUER ?? 'https://auth.unilink.ac.th/application/o/unilink-portal/',
      clientId: process.env.AUTHENTIK_CLIENT_ID ?? '',
      clientSecret: process.env.AUTHENTIK_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid profile email groups',
        },
      },
      profile(profile) {
        const groups = (profile.groups as string[]) ?? []
        return {
          id: profile.sub as string,
          name: (profile.name as string) ?? (profile.preferred_username as string) ?? '',
          email: profile.email as string,
          image: (profile.picture as string) ?? null,
          role: mapGroupsToRole(groups),
        }
      },
    },
  ],

  session: {
    strategy: 'jwt',
    maxAge: Number(process.env.SESSION_MAX_AGE ?? 28800), // 8 hours
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user, account }) {
      const t = token as Record<string, unknown>
      if (user) {
        t.role = user.role ?? 'viewer'
      }
      if (account?.access_token) {
        t.accessToken = account.access_token
      }
      return token
    },

    async session({ session, token }) {
      const t = token as Record<string, unknown>
      session.user.id = (token.sub as string) ?? ''
      session.user.role = (t.role as 'admin' | 'registrar' | 'viewer') ?? 'viewer'
      session.accessToken = t.accessToken as string | undefined
      return session
    },

    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = request.nextUrl.pathname !== '/login'

      if (isOnDashboard) {
        if (!isLoggedIn) return false
        return true
      }

      // If logged in and trying to access /login, redirect to dashboard
      if (isLoggedIn) {
        return Response.redirect(new URL('/', request.nextUrl))
      }

      return true
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
