'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useApproveTransfer, useRejectTransfer } from '@/hooks/use-transfers'
import {
  transferDecisionSchema,
  type TransferDecisionFormValues,
} from '@/lib/schemas/transfer-schemas'

interface DecisionFormProps {
  transferId: string
  onSuccess?: () => void
}

export function DecisionForm({
  transferId,
  onSuccess,
}: DecisionFormProps): React.ReactElement {
  const { toast } = useToast()
  const approveMutation = useApproveTransfer()
  const rejectMutation = useRejectTransfer()

  const form = useForm<TransferDecisionFormValues>({
    resolver: zodResolver(transferDecisionSchema),
    defaultValues: {
      reviewNote: '',
    },
  })

  const isSubmitting = approveMutation.isPending || rejectMutation.isPending

  async function handleApprove(values: TransferDecisionFormValues): Promise<void> {
    try {
      await approveMutation.mutateAsync({
        transferId,
        reviewNote: values.reviewNote,
      })
      toast({
        title: 'อนุมัติสำเร็จ',
        description: 'Credit Transfer ได้รับการอนุมัติแล้ว',
      })
      onSuccess?.()
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอนุมัติได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  async function handleReject(values: TransferDecisionFormValues): Promise<void> {
    try {
      await rejectMutation.mutateAsync({
        transferId,
        reviewNote: values.reviewNote,
      })
      toast({
        title: 'ปฏิเสธสำเร็จ',
        description: 'Credit Transfer ถูกปฏิเสธแล้ว',
      })
      onSuccess?.()
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
        <CardTitle className="text-base font-semibold">
          พิจารณา Credit Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="reviewNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="กรอกหมายเหตุประกอบการตัดสินใจ..."
                      className="min-h-[100px]"
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
                onClick={form.handleSubmit(handleReject)}
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
