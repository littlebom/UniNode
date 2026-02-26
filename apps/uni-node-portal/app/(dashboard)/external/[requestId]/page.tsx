'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExternalDetail } from '@/hooks/use-external'
import { ExternalReview } from '@/components/external/external-review'

interface ExternalDetailPageProps {
  params: Promise<{ requestId: string }>
}

export default function ExternalDetailPage({
  params,
}: ExternalDetailPageProps): React.ReactElement {
  const { requestId } = use(params)
  const router = useRouter()
  const { data: detail, isLoading } = useExternalDetail(requestId)

  return (
    <div className="space-y-6">
      {/* Back Button + Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/external')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">กลับ</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            ตรวจสอบ External Credential
          </h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-48" />
          ) : detail ? (
            <p className="text-sm text-muted-foreground">
              Request ID: {requestId}
            </p>
          ) : null}
        </div>
      </div>

      {/* Review Content */}
      {isLoading ? (
        <ExternalReview
          detail={{} as never}
          isLoading={true}
        />
      ) : detail ? (
        <ExternalReview detail={detail} isLoading={false} />
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            ไม่พบข้อมูล External Credential
          </p>
        </div>
      )}
    </div>
  )
}
