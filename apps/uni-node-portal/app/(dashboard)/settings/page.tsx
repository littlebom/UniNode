'use client'

import Link from 'next/link'
import { Database, Key, Globe, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SettingsCardConfig {
  title: string
  description: string
  href: string
  icon: LucideIcon
  iconColorClass: string
}

const settingsCards: SettingsCardConfig[] = [
  {
    title: 'SIS Integration',
    description:
      'จัดการการเชื่อมต่อกับระบบ Student Information System (SIS) รวมถึง Webhook และสถานะ Sync',
    href: '/settings/sis',
    icon: Database,
    iconColorClass: 'text-blue-600 bg-blue-50',
  },
  {
    title: 'Key Management',
    description:
      'ดูข้อมูล DID, Public Key และ Signing Key ที่ใช้ในระบบ Verifiable Credentials',
    href: '/settings/keys',
    icon: Key,
    iconColorClass: 'text-violet-600 bg-violet-50',
  },
  {
    title: 'Registry Connection',
    description:
      'ดูข้อมูลการเชื่อมต่อกับ UniRegistry, Node ID และสถานะ Aggregate Sync',
    href: '/settings/registry',
    icon: Globe,
    iconColorClass: 'text-emerald-600 bg-emerald-50',
  },
]

export default function SettingsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          ตั้งค่าระบบและจัดการการเชื่อมต่อ
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {settingsCards.map((card) => {
          const Icon = card.icon

          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.iconColorClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription className="mt-1.5">
                      {card.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
