'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Check, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  useRegistryConnection,
  useUpdateRegistryConnection,
} from '@/hooks/use-settings'
import {
  registryConfigSchema,
  type RegistryConfigFormValues,
} from '@/lib/schemas/settings-schemas'

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: 'คัดลอกแล้ว',
        description: 'คัดลอกข้อมูลไปยัง Clipboard เรียบร้อยแล้ว',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: 'คัดลอกไม่สำเร็จ',
        description: 'ไม่สามารถคัดลอกข้อมูลได้',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  )
}

function RegistryConnectionSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full max-w-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'เมื่อสักครู่'
  if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  return `${diffDays} วันที่แล้ว`
}

export function RegistryConnectionCard(): React.ReactElement {
  const { data, isLoading } = useRegistryConnection()
  const updateMutation = useUpdateRegistryConnection()
  const { toast } = useToast()

  const form = useForm<RegistryConfigFormValues>({
    resolver: zodResolver(registryConfigSchema),
    defaultValues: {
      registryUrl: '',
      syncEnabled: true,
      syncCron: '0 2 * * *',
    },
  })

  useEffect(() => {
    if (data) {
      form.reset({
        registryUrl: data.registryUrl,
        syncEnabled: data.syncEnabled,
        syncCron: data.syncCron,
      })
    }
  }, [data, form])

  if (isLoading) {
    return <RegistryConnectionSkeleton />
  }

  function onSubmit(values: RegistryConfigFormValues): void {
    updateMutation.mutate(values, {
      onSuccess: () => {
        toast({
          title: 'บันทึกสำเร็จ',
          description: 'อัปเดตการตั้งค่า Registry Connection เรียบร้อยแล้ว',
        })
      },
      onError: (error: Error) => {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: error.message || 'ไม่สามารถบันทึกการตั้งค่าได้',
          variant: 'destructive',
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Editable Settings */}
      <Card>
        <CardHeader>
          <CardTitle>การเชื่อมต่อ Registry</CardTitle>
          <CardDescription>
            ตั้งค่า URL และ Aggregate Sync สำหรับเชื่อมต่อกับ UniRegistry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="registryUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registry URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="http://registry-nginx/api/v1"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL ของ UniRegistry API ที่ใช้ส่ง Aggregate Data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="syncEnabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aggregate Sync</FormLabel>
                    <Select
                      value={field.value ? 'enabled' : 'disabled'}
                      onValueChange={(v) => field.onChange(v === 'enabled')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      เปิด/ปิดการส่ง Aggregate Data ไปยัง Registry อัตโนมัติ
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="syncCron"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sync Schedule (Cron)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0 2 * * *"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Cron Expression สำหรับกำหนดเวลา Sync (เช่น &quot;0 2 * *
                      *&quot; = ทุกวันเวลา 02:00)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                บันทึก
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Read-only Node Info */}
      <Card>
        <CardHeader>
          <CardTitle>Node Identity</CardTitle>
          <CardDescription>
            ข้อมูล Node ID และ DID (กำหนดจาก Environment Variables)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Node ID */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Node ID
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono">{data?.nodeId ?? '-'}</p>
              {data?.nodeId && <CopyButton text={data.nodeId} />}
            </div>
          </div>

          <Separator />

          {/* Node Name */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Node Name
            </p>
            <p className="text-sm">{data?.nodeName ?? '-'}</p>
          </div>

          <Separator />

          {/* Node DID */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Node DID
            </p>
            <div className="flex items-center gap-2">
              <p className="break-all text-sm font-mono">
                {data?.nodeDid ?? '-'}
              </p>
              {data?.nodeDid && <CopyButton text={data.nodeDid} />}
            </div>
          </div>

          <Separator />

          {/* Last Sync */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Last Sync
            </p>
            {data?.lastSync ? (
              <div className="flex items-center gap-3">
                <p className="text-sm">
                  {formatRelativeTime(data.lastSync)}
                </p>
                {data.lastSyncCourseCount != null && (
                  <Badge variant="outline">
                    {data.lastSyncCourseCount} courses
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่เคย Sync</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
