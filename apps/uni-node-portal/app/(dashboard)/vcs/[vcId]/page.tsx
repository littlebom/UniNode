'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useVCDetail } from '@/hooks/use-vcs'
import { PermissionGate } from '@/components/layout/permission-gate'
import { Button } from '@/components/ui/button'
import { VCDetailCard } from '@/components/vc/vc-detail-card'
import { RevokeDialog } from '@/components/vc/revoke-dialog'

interface VCDetailPageProps {
  params: Promise<{ vcId: string }>
}

export default function VCDetailPage({
  params,
}: VCDetailPageProps): React.ReactElement {
  const { vcId } = use(params)
  const router = useRouter()
  const { data, isLoading } = useVCDetail(vcId)

  function handleRevokeSuccess(): void {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/vcs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              รายละเอียด VC
            </h1>
            <p className="text-muted-foreground">
              {vcId.slice(0, 12)}...
            </p>
          </div>
        </div>

        {data && data.status !== 'revoked' && (
          <PermissionGate permission="vc:revoke">
            <RevokeDialog vcId={vcId} onSuccess={handleRevokeSuccess} />
          </PermissionGate>
        )}
      </div>

      {/* VC Detail Card */}
      <VCDetailCard vc={data!} isLoading={isLoading} />
    </div>
  )
}
