'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { formatThaiDateFromISO } from '@unilink/ui'
import { useToast } from '@/hooks/use-toast'
import { useApproveExternal, useRejectExternal } from '@/hooks/use-external'
import type { ExternalDetail } from '@/hooks/use-external'
import { PermissionGate } from '@/components/layout/permission-gate'
import {
  externalReviewSchema,
  type ExternalReviewFormValues,
} from '@/lib/schemas/external-schemas'

interface ExternalReviewProps {
  detail: ExternalDetail
  isLoading: boolean
}

type ExternalStatus = ExternalDetail['status']

interface StatusBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

const STATUS_BADGE_MAP: Record<ExternalStatus, StatusBadgeConfig> = {
  pending: { label: 'รอตรวจสอบ', variant: 'secondary' },
  approved: { label: 'อนุมัติแล้ว', variant: 'default' },
  rejected: { label: 'ปฏิเสธแล้ว', variant: 'destructive' },
}

function getPlatformBadgeClass(platform: string): string {
  const lower = platform.toLowerCase()
  if (lower === 'coursera') return 'bg-blue-100 text-blue-700'
  if (lower === 'edx') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[140px] text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function ReviewSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-64" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ReviewForm({
  detail,
}: {
  detail: ExternalDetail
}): React.ReactElement {
  const { toast } = useToast()
  const approveMutation = useApproveExternal()
  const rejectMutation = useRejectExternal()

  const form = useForm<ExternalReviewFormValues>({
    resolver: zodResolver(externalReviewSchema),
    defaultValues: {
      recognizedCourseId: '',
      recognizedCredits: 3,
      note: '',
    },
  })

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending

  async function handleApprove(values: ExternalReviewFormValues): Promise<void> {
    try {
      await approveMutation.mutateAsync({
        requestId: detail.requestId,
        ...values,
      })
      toast({
        title: 'อนุมัติสำเร็จ',
        description: 'External Credential ได้รับการอนุมัติแล้ว',
      })
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอนุมัติได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  async function handleReject(): Promise<void> {
    const note = form.getValues('note')
    try {
      await rejectMutation.mutateAsync({
        requestId: detail.requestId,
        note: note || undefined,
      })
      toast({
        title: 'ปฏิเสธสำเร็จ',
        description: 'External Credential ถูกปฏิเสธแล้ว',
      })
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถปฏิเสธได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">พิจารณา</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="recognizedCourseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสวิชาที่ Recognize</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น CS101, MATH201"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recognizedCredits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จำนวนหน่วยกิต</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="กรอกหมายเหตุเพิ่มเติม..."
                      className="min-h-[80px]"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={isSubmitting}
                onClick={form.handleSubmit(handleApprove)}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                อนุมัติ
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleReject}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                ปฏิเสธ
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export function ExternalReview({
  detail,
  isLoading,
}: ExternalReviewProps): React.ReactElement {
  if (isLoading) {
    return <ReviewSkeleton />
  }

  const statusConfig = STATUS_BADGE_MAP[detail.status]

  return (
    <div className="space-y-6">
      {/* Section 1: External Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            ข้อมูลคอร์สภายนอก
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Request ID">
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {detail.requestId}
            </code>
          </DetailRow>
          <DetailRow label="รหัสนักศึกษา">{detail.studentId}</DetailRow>
          <DetailRow label="แพลตฟอร์ม">
            <Badge
              variant="outline"
              className={getPlatformBadgeClass(detail.platform)}
            >
              {detail.platform}
            </Badge>
          </DetailRow>
          <DetailRow label="ชื่อคอร์ส">{detail.courseName}</DetailRow>
          <DetailRow label="สถาบัน">{detail.institution}</DetailRow>
          <DetailRow label="วันที่สำเร็จ">
            {formatThaiDateFromISO(detail.completionDate)}
          </DetailRow>
          {detail.score && (
            <DetailRow label="คะแนน">{detail.score}</DetailRow>
          )}
          {detail.hours != null && (
            <DetailRow label="ชั่วโมง">{detail.hours} ชม.</DetailRow>
          )}
          <Separator />
          <DetailRow label="สถานะ">
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </DetailRow>
          {detail.requestedCourseId && (
            <DetailRow label="วิชาที่ขอเทียบ">
              {detail.requestedCourseId}
            </DetailRow>
          )}
          {detail.recognizedCourseId && (
            <DetailRow label="วิชาที่ Recognize">
              {detail.recognizedCourseId}
            </DetailRow>
          )}
          {detail.recognizedCredits != null && (
            <DetailRow label="หน่วยกิตที่ Recognize">
              {detail.recognizedCredits}
            </DetailRow>
          )}
          {detail.reviewNote && (
            <DetailRow label="หมายเหตุ">{detail.reviewNote}</DetailRow>
          )}
          {detail.decidedAt && (
            <DetailRow label="วันที่ตัดสินใจ">
              {formatThaiDateFromISO(detail.decidedAt)}
            </DetailRow>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Certificate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Certificate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.certificateUrl ? (
            <DetailRow label="Certificate URL">
              <a
                href={detail.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                ดู Certificate
                <ExternalLink className="h-3 w-3" />
              </a>
            </DetailRow>
          ) : (
            <DetailRow label="Certificate URL">
              <span className="text-muted-foreground">-</span>
            </DetailRow>
          )}
          {detail.verificationUrl ? (
            <DetailRow label="Verification URL">
              <a
                href={detail.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                ตรวจสอบ
                <ExternalLink className="h-3 w-3" />
              </a>
            </DetailRow>
          ) : (
            <DetailRow label="Verification URL">
              <span className="text-muted-foreground">-</span>
            </DetailRow>
          )}
          {!detail.certificateUrl && !detail.verificationUrl && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ไม่มีข้อมูล Certificate
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Review Form (only for pending) */}
      {detail.status === 'pending' && (
        <PermissionGate permission="external:approve">
          <ReviewForm detail={detail} />
        </PermissionGate>
      )}
    </div>
  )
}
