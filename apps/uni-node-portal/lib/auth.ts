import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

/**
 * NextAuth v5 configuration with Credentials provider.
 * Authenticates against UniRegistry API via POST /auth/login.
 *
 * Role mapping (Registry -> Portal):
 * - super_admin  -> admin
 * - node_admin   -> admin
 * - staff        -> viewer
 * - default      -> viewer
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
    accessToken?: string
    refreshToken?: string
  }
}

const REGISTRY_AUTH_URL =
  process.env.REGISTRY_AUTH_URL ?? 'http://registry-nginx/api/v1'

function mapRegistryRoleToPortalRole(
  role: string,
): 'admin' | 'registrar' | 'viewer' {
  if (role === 'super_admin') return 'admin'
  if (role === 'node_admin') return 'admin'
  if (role === 'staff') return 'viewer'
  return 'viewer'
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }
  const payload = parts[1]
  const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
  return JSON.parse(decoded) as Record<string, unknown>
}

export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) {
          return null
        }

        try {
          const response = await fetch(`${REGISTRY_AUTH_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            return null
          }

          const body = (await response.json()) as {
            success: boolean
            data: {
              accessToken: string
              refreshToken: string
              expiresIn: number
              tokenType: string
            }
          }

          if (!body.success) {
            return null
          }

          const { accessToken, refreshToken } = body.data

          // Decode JWT to extract user info
          const payload = decodeJwtPayload(accessToken)
          const sub = (payload.sub as string) ?? ''
          const userEmail = (payload.email as string) ?? email
          const name = (payload.name as string) ?? ''
          const role = (payload.role as string) ?? ''

          return {
            id: sub,
            email: userEmail,
            name,
            role: mapRegistryRoleToPortalRole(role),
            accessToken,
            refreshToken,
          }
        } catch {
          return null
        }
      },
    }),
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
    async jwt({ token, user }) {
      const t = token as Record<string, unknown>
      if (user) {
        t.role = user.role ?? 'viewer'
        t.accessToken = (user as Record<string, unknown>).accessToken
        t.refreshToken = (user as Record<string, unknown>).refreshToken
      }
      return token
    },

    async session({ session, token }) {
      const t = token as Record<string, unknown>
      session.user.id = (token.sub as string) ?? ''
      session.user.role =
        (t.role as 'admin' | 'registrar' | 'viewer') ?? 'viewer'
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
