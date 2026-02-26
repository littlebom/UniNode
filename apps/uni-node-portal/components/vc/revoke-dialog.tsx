'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldX } from 'lucide-react'
import { revokeVCSchema, type RevokeVCFormValues } from '@/lib/schemas/vc-schemas'
import { useRevokeVC } from '@/hooks/use-vcs'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface RevokeDialogProps {
  vcId: string
  onSuccess?: () => void
}

export function RevokeDialog({
  vcId,
  onSuccess,
}: RevokeDialogProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const revokeVC = useRevokeVC()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RevokeVCFormValues>({
    resolver: zodResolver(revokeVCSchema),
    defaultValues: {
      reason: '',
    },
  })

  async function onSubmit(data: RevokeVCFormValues): Promise<void> {
    try {
      await revokeVC.mutateAsync({ vcId, reason: data.reason })
      toast({
        title: 'ยกเลิก VC สำเร็จ',
        description: 'Verifiable Credential ถูกยกเลิกเรียบร้อยแล้ว',
      })
      setOpen(false)
      reset()
      onSuccess?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: message,
        variant: 'destructive',
      })
    }
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      reset()
    }
    setOpen(nextOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <ShieldX className="mr-2 h-4 w-4" />
          ยกเลิก VC
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการยกเลิก Verifiable Credential</AlertDialogTitle>
          <AlertDialogDescription>
            การยกเลิก VC จะเพิ่มรายการในรายการเพิกถอน (Status List) ซึ่งไม่สามารถย้อนกลับได้
            กรุณาระบุเหตุผลในการยกเลิก
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">เหตุผลในการยกเลิก</Label>
              <Textarea
                id="revoke-reason"
                placeholder="ระบุเหตุผลในการยกเลิก VC นี้..."
                rows={3}
                {...register('reason')}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">
                  {errors.reason.message}
                </p>
              )}
            </div>

            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">
                VC ID: <code className="font-mono text-xs">{vcId.slice(0, 24)}...</code>
              </p>
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={revokeVC.isPending}>
              ยกเลิก
            </AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={revokeVC.isPending}
            >
              {revokeVC.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                'ยืนยันยกเลิก VC'
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
