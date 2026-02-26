'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plug, Save, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import {
  useSISConfig,
  useUpdateSISConfig,
  useTestSISConnection,
} from '@/hooks/use-settings'
import {
  sisConfigSchema,
  type SISConfigFormValues,
} from '@/lib/schemas/settings-schemas'
import { cn } from '@/lib/utils'

function getSyncStatusBadge(
  status: 'connected' | 'error' | 'never_connected',
): React.ReactElement {
  const variants: Record<string, { label: string; className: string }> = {
    connected: {
      label: 'เชื่อมต่อแล้ว',
      className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    },
    error: {
      label: 'ผิดพลาด',
      className: 'bg-red-100 text-red-800 hover:bg-red-100',
    },
    never_connected: {
      label: 'ยังไม่เคยเชื่อมต่อ',
      className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    },
  }

  const variant = variants[status]

  return (
    <Badge variant="secondary" className={variant.className}>
      {variant.label}
    </Badge>
  )
}

function formatLastReceived(dateStr: string | null): string {
  if (!dateStr) return 'ไม่เคยได้รับ'
  try {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'ไม่เคยได้รับ'
  }
}

function SISConfigSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function SISConfigForm(): React.ReactElement {
  const { data: config, isLoading } = useSISConfig()
  const updateMutation = useUpdateSISConfig()
  const testMutation = useTestSISConnection()
  const { toast } = useToast()
  const [secretVisible, setSecretVisible] = useState(false)

  const form = useForm<SISConfigFormValues>({
    resolver: zodResolver(sisConfigSchema),
    defaultValues: {
      sisApiUrl: '',
    },
  })

  useEffect(() => {
    if (config) {
      form.reset({
        sisApiUrl: config.sisApiUrl,
      })
    }
  }, [config, form])

  if (isLoading) {
    return <SISConfigSkeleton />
  }

  function onSubmit(values: SISConfigFormValues): void {
    updateMutation.mutate(values, {
      onSuccess: () => {
        toast({
          title: 'บันทึกสำเร็จ',
          description: 'อัปเดตการตั้งค่า SIS เรียบร้อยแล้ว',
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

  function handleTestConnection(): void {
    testMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.success) {
          toast({
            title: 'เชื่อมต่อสำเร็จ',
            description: result.latencyMs
              ? `เชื่อมต่อ SIS สำเร็จ (${result.latencyMs}ms)`
              : result.message,
          })
        } else {
          toast({
            title: 'เชื่อมต่อไม่สำเร็จ',
            description: result.message,
            variant: 'destructive',
          })
        }
      },
      onError: (error: Error) => {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: error.message || 'ไม่สามารถทดสอบการเชื่อมต่อได้',
          variant: 'destructive',
        })
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* SIS API URL Form */}
      <Card>
        <CardHeader>
          <CardTitle>การเชื่อมต่อ SIS API</CardTitle>
          <CardDescription>
            ตั้งค่า URL สำหรับเชื่อมต่อกับระบบ Student Information System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="sisApiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIS API URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://sis.example.ac.th/api"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL ของ SIS API ที่ใช้รับส่งข้อมูลนักศึกษา
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  บันทึก
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="mr-2 h-4 w-4" />
                  )}
                  ทดสอบการเชื่อมต่อ
                </Button>
              </div>

              {/* Test Connection Result */}
              {testMutation.data && (
                <div
                  className={cn(
                    'rounded-lg border p-4 text-sm',
                    testMutation.data.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800',
                  )}
                >
                  <p className="font-medium">
                    {testMutation.data.success
                      ? 'เชื่อมต่อสำเร็จ'
                      : 'เชื่อมต่อไม่สำเร็จ'}
                  </p>
                  <p className="mt-1">{testMutation.data.message}</p>
                  {testMutation.data.latencyMs !== undefined && (
                    <p className="mt-1 text-xs">
                      Latency: {testMutation.data.latencyMs}ms
                    </p>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Webhook & Sync Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook & Sync Status</CardTitle>
          <CardDescription>
            ข้อมูล Webhook และสถานะการเชื่อมต่อปัจจุบัน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Webhook Endpoint
            </p>
            <p className="text-sm font-mono">
              {config?.webhookEndpoint ?? '-'}
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Webhook Secret
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono">
                {secretVisible
                  ? (config?.webhookSecret ?? '-')
                  : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSecretVisible((prev) => !prev)}
              >
                {secretVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Webhook ที่ได้รับล่าสุด
            </p>
            <p className="text-sm">
              {formatLastReceived(config?.lastWebhookReceived ?? null)}
            </p>
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              สถานะ Sync
            </p>
            <div>
              {config
                ? getSyncStatusBadge(config.syncStatus)
                : <Badge variant="secondary">ไม่ทราบ</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
