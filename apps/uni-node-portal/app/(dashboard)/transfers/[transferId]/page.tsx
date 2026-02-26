'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransferDetail } from '@/hooks/use-transfers'
import { TransferDetailView } from '@/components/transfer/transfer-detail'
import { CourseComparison } from '@/components/transfer/course-comparison'
import { LOComparison } from '@/components/transfer/lo-comparison'
import { DecisionForm } from '@/components/transfer/decision-form'
import { PermissionGate } from '@/components/layout/permission-gate'

interface TransferDetailPageProps {
  params: Promise<{ transferId: string }>
}

export default function TransferDetailPage({
  params,
}: TransferDetailPageProps): React.ReactElement {
  const { transferId } = use(params)
  const router = useRouter()
  const { data: transfer, isLoading } = useTransferDetail(transferId)

  function handleDecisionSuccess(): void {
    router.push('/transfers')
  }

  return (
    <div className="space-y-6">
      {/* Back Button + Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/transfers')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">กลับ</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            รายละเอียด Credit Transfer
          </h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-48" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Transfer ID: {transferId}
            </p>
          )}
        </div>
      </div>

      {/* Transfer Detail */}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full max-w-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : transfer ? (
        <>
          <TransferDetailView transfer={transfer} isLoading={false} />

          {/* Course Comparison */}
          <CourseComparison transfer={transfer} />

          {/* LO Match Visualization */}
          {transfer.loMatchPercentage != null && (
            <LOComparison loMatchPercentage={transfer.loMatchPercentage} />
          )}

          {/* Decision Form - only for pending transfers */}
          {transfer.status === 'pending' && (
            <PermissionGate permission="transfer:approve">
              <DecisionForm
                transferId={transfer.transferId}
                onSuccess={handleDecisionSuccess}
              />
            </PermissionGate>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            ไม่พบข้อมูล Credit Transfer
          </p>
        </div>
      )}
    </div>
  )
}
