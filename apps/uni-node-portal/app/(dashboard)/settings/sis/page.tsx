'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SISConfigForm } from '@/components/settings/sis-config-form'

export default function SISSettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIS Integration</h1>
          <p className="text-muted-foreground">
            จัดการการเชื่อมต่อกับระบบ Student Information System
          </p>
        </div>
      </div>

      <SISConfigForm />
    </div>
  )
}
