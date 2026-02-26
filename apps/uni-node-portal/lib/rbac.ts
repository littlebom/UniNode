'use client'

import { useSession } from 'next-auth/react'

export type PortalRole = 'admin' | 'registrar' | 'viewer'

export type Permission =
  | 'vc:issue'
  | 'vc:revoke'
  | 'vc:view'
  | 'transfer:approve'
  | 'transfer:reject'
  | 'transfer:view'
  | 'course:create'
  | 'course:edit'
  | 'course:view'
  | 'external:approve'
  | 'external:reject'
  | 'external:view'
  | 'student:view'
  | 'report:view'
  | 'report:export'
  | 'settings:edit'

const rolePermissions: Record<PortalRole, Permission[]> = {
  admin: [
    'vc:issue', 'vc:revoke', 'vc:view',
    'transfer:approve', 'transfer:reject', 'transfer:view',
    'course:create', 'course:edit', 'course:view',
    'external:approve', 'external:reject', 'external:view',
    'student:view',
    'report:view', 'report:export',
    'settings:edit',
  ],
  registrar: [
    'vc:issue', 'vc:view',
    'transfer:approve', 'transfer:reject', 'transfer:view',
    'course:view',
    'external:approve', 'external:reject', 'external:view',
    'student:view',
    'report:view',
  ],
  viewer: [
    'vc:view',
    'transfer:view',
    'course:view',
    'student:view',
    'report:view',
  ],
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: PortalRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

/**
 * React hook to check if the current user has a specific permission.
 */
export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession()
  const role = session?.user?.role ?? 'viewer'
  return hasPermission(role, permission)
}

/**
 * React hook to get the current user's role.
 */
export function useRole(): PortalRole {
  const { data: session } = useSession()
  return session?.user?.role ?? 'viewer'
}
