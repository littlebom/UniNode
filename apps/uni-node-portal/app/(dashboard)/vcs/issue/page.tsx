'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IssueVCForm } from '@/components/vc/issue-vc-form'

export default function IssueVCPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/vcs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ออก Verifiable Credential ใหม่
          </h1>
          <p className="text-muted-foreground">
            กรอกข้อมูลเพื่อออก VC ให้นักศึกษา
          </p>
        </div>
      </div>

      {/* Issue Form */}
      <IssueVCForm />
    </div>
  )
}
