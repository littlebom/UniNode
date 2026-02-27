'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/rbac'
import type { PortalRole } from '@/lib/rbac'
import { useUIStore } from '@/lib/stores/ui-store'
import { navItems } from './nav-items'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'

function NavLinks({ collapsed }: { collapsed: boolean }): React.ReactElement {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user?.role ?? 'viewer') as PortalRole

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  )

  return (
    <nav className="flex flex-col gap-1 px-2">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              collapsed && 'justify-center px-2',
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

const nodeName = process.env.NEXT_PUBLIC_NODE_NAME ?? 'UniLink Portal'

export function Sidebar(): React.ReactElement {
  const { sidebarCollapsed, toggleSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden border-r bg-card lg:flex lg:flex-col lg:transition-all lg:duration-200',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b px-4">
          {!sidebarCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                UL
              </div>
              <span className="font-semibold text-foreground truncate">{nodeName}</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebarCollapsed}
            className={cn('h-8 w-8', sidebarCollapsed ? 'mx-auto' : 'ml-auto')}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <NavLinks collapsed={sidebarCollapsed} />
        </ScrollArea>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              UniLink Node Portal v0.1.0
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                UL
              </div>
              <span className="font-semibold text-foreground truncate">{nodeName}</span>
            </Link>
          </div>
          <ScrollArea className="flex-1 py-4">
            <NavLinks collapsed={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
