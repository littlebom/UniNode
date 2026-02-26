'use client'

import { usePermission } from '@/lib/rbac'
import type { Permission } from '@/lib/rbac'

interface PermissionGateProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Conditionally render children based on user's RBAC permission.
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps): React.ReactElement {
  const hasAccess = usePermission(permission)
  return <>{hasAccess ? children : fallback}</>
}
