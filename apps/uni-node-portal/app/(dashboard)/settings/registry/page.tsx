'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RegistryConnectionCard } from '@/components/settings/registry-connection-card'

export default function RegistrySettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Registry Connection
          </h1>
          <p className="text-muted-foreground">
            ข้อมูลการเชื่อมต่อกับ UniRegistry
          </p>
        </div>
      </div>

      <RegistryConnectionCard />
    </div>
  )
}
