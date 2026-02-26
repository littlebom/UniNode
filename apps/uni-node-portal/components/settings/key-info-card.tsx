'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { useKeyInfo } from '@/hooks/use-settings'

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

function KeyInfoSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-full max-w-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function KeyInfoCard(): React.ReactElement {
  const { data, isLoading } = useKeyInfo()

  if (isLoading) {
    return <KeyInfoSkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูล DID & Signing Key</CardTitle>
        <CardDescription>
          ข้อมูล Decentralized Identifier และ Public Key สำหรับ Verifiable
          Credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* DID */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">DID</p>
          <div className="flex items-center gap-2">
            <p className="break-all text-sm font-mono">
              {data?.did ?? '-'}
            </p>
            {data?.did && <CopyButton text={data.did} />}
          </div>
        </div>

        <Separator />

        {/* Public Key */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            Public Key (Multibase)
          </p>
          <div className="flex items-center gap-2">
            <p className="break-all text-sm font-mono">
              {data?.publicKeyMultibase ?? '-'}
            </p>
            {data?.publicKeyMultibase && (
              <CopyButton text={data.publicKeyMultibase} />
            )}
          </div>
        </div>

        <Separator />

        {/* Key Type */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">Key Type</p>
          <div>
            {data?.keyType ? (
              <Badge variant="secondary">{data.keyType}</Badge>
            ) : (
              <p className="text-sm">-</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Signing Key Path */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            Signing Key Path
          </p>
          <p className="text-sm font-mono">
            {data?.signingKeyPath ?? '-'}
          </p>
        </div>

        <Separator />

        {/* DID Document URL */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">
            DID Document URL
          </p>
          {data?.didDocumentUrl ? (
            <a
              href={data.didDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              {data.didDocumentUrl}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <p className="text-sm">-</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
