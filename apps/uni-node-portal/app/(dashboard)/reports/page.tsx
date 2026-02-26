'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { VCSummary } from '@/components/reports/vc-summary'
import { TransferSummary } from '@/components/reports/transfer-summary'
import { CoursePopularity } from '@/components/reports/course-popularity'

function ExportButton(): React.ReactElement {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Coming soon</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function ReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            รายงานสถิติระบบ Verifiable Credentials และ Credit Transfer
          </p>
        </div>
      </div>

      <Tabs defaultValue="vc-summary" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="vc-summary">VC Summary</TabsTrigger>
            <TabsTrigger value="transfer">Credit Transfer</TabsTrigger>
            <TabsTrigger value="courses">Course Popularity</TabsTrigger>
          </TabsList>
          <ExportButton />
        </div>

        <TabsContent value="vc-summary">
          <VCSummary />
        </TabsContent>

        <TabsContent value="transfer">
          <TransferSummary />
        </TabsContent>

        <TabsContent value="courses">
          <CoursePopularity />
        </TabsContent>
      </Tabs>
    </div>
  )
}
