'use client'

import { useState, useCallback } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { nodeApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { SyllabusFormValues } from '@/lib/schemas/course-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SyllabusEditorProps {
  courseId: string
  syllabus: SyllabusFormValues[]
  isLoading: boolean
}

function generateEmptyWeeks(): SyllabusFormValues[] {
  return Array.from({ length: 16 }, (_, i) => ({
    week: i + 1,
    topic: '',
    description: '',
  }))
}

function mergeSyllabus(
  existing: SyllabusFormValues[]
): SyllabusFormValues[] {
  const emptyWeeks = generateEmptyWeeks()
  const existingMap = new Map(existing.map((s) => [s.week, s]))

  return emptyWeeks.map((empty) => existingMap.get(empty.week) ?? empty)
}

function EditorSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-3 rounded-lg border p-3">
          <Skeleton className="col-span-1 h-10" />
          <Skeleton className="col-span-4 h-10" />
          <Skeleton className="col-span-7 h-10" />
        </div>
      ))}
    </div>
  )
}

export function SyllabusEditor({
  courseId,
  syllabus: initialSyllabus,
  isLoading,
}: SyllabusEditorProps): React.ReactElement {
  const { toast } = useToast()
  const [weeks, setWeeks] = useState<SyllabusFormValues[]>(() =>
    mergeSyllabus(initialSyllabus)
  )
  const [isSaving, setIsSaving] = useState(false)

  const updateWeek = useCallback(
    (weekNumber: number, field: 'topic' | 'description', value: string): void => {
      setWeeks((prev) =>
        prev.map((w) =>
          w.week === weekNumber ? { ...w, [field]: value } : w
        )
      )
    },
    []
  )

  async function handleSave(): Promise<void> {
    // Only send weeks that have content
    const filledWeeks = weeks.filter((w) => w.topic.trim() !== '')

    setIsSaving(true)
    try {
      await nodeApi.put(`/courses/${courseId}/syllabus`, {
        syllabus: filledWeeks,
      })
      toast({
        title: 'บันทึกสำเร็จ',
        description: 'Syllabus ถูกอัปเดตเรียบร้อยแล้ว',
      })
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึก Syllabus ได้',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <EditorSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {weeks.filter((w) => w.topic.trim() !== '').length} / 16 สัปดาห์มีข้อมูล
        </p>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          บันทึกทั้งหมด
        </Button>
      </div>

      {/* Weekly Grid */}
      <Card>
        <CardContent className="divide-y p-0">
          {weeks.map((week) => (
            <div
              key={week.week}
              className="grid grid-cols-12 items-start gap-3 p-4"
            >
              {/* Week Number */}
              <div className="col-span-1 flex items-center justify-center pt-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {week.week}
                </span>
              </div>

              {/* Topic */}
              <div className="col-span-4">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  หัวข้อ
                </label>
                <Input
                  placeholder={`หัวข้อสัปดาห์ที่ ${week.week}`}
                  value={week.topic}
                  onChange={(e) =>
                    updateWeek(week.week, 'topic', e.target.value)
                  }
                />
              </div>

              {/* Description */}
              <div className="col-span-7">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  รายละเอียด
                </label>
                <Textarea
                  rows={1}
                  placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  value={week.description ?? ''}
                  onChange={(e) =>
                    updateWeek(week.week, 'description', e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
