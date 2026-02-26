import {
  LayoutDashboard,
  FileCheck,
  ArrowLeftRight,
  BookOpen,
  GraduationCap,
  Globe,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { Permission } from '@/lib/rbac'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
  children?: NavItem[]
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Verifiable Credentials',
    href: '/vcs',
    icon: FileCheck,
    permission: 'vc:view',
  },
  {
    label: 'Credit Transfer',
    href: '/transfers',
    icon: ArrowLeftRight,
    permission: 'transfer:view',
  },
  {
    label: 'Course Catalog',
    href: '/courses',
    icon: BookOpen,
    permission: 'course:view',
  },
  {
    label: 'Students',
    href: '/students',
    icon: GraduationCap,
    permission: 'student:view',
  },
  {
    label: 'External Credentials',
    href: '/external',
    icon: Globe,
    permission: 'external:view',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: 'report:view',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings:edit',
  },
]
