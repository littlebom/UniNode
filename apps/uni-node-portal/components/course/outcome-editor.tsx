'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react'
import { nodeApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { OutcomeFormValues } from '@/lib/schemas/course-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OutcomeEditorProps {
  courseId: string
  outcomes: OutcomeFormValues[]
  isLoading: boolean
}

const bloomLevels = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const

function EditorSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="grid grid-cols-12 gap-3">
            <Skeleton className="col-span-5 h-16" />
            <Skeleton className="col-span-2 h-10" />
            <Skeleton className="col-span-2 h-10" />
            <Skeleton className="col-span-2 h-10" />
            <Skeleton className="col-span-1 h-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function OutcomeEditor({
  courseId,
  outcomes: initialOutcomes,
  isLoading,
}: OutcomeEditorProps): React.ReactElement {
  const { toast } = useToast()
  const [items, setItems] = useState<OutcomeFormValues[]>(initialOutcomes)
  const [isSaving, setIsSaving] = useState(false)

  // Sync initial outcomes when they load
  useState(() => {
    if (initialOutcomes.length > 0 && items.length === 0) {
      setItems(initialOutcomes)
    }
  })

  const updateItem = useCallback(
    (index: number, field: keyof OutcomeFormValues, value: string | number | undefined): void => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      )
    },
    []
  )

  function addItem(): void {
    setItems((prev) => [
      ...prev,
      {
        identifier: undefined,
        fullStatement: '',
        humanCodingScheme: '',
        bloomLevel: undefined,
        sortOrder: prev.length + 1,
      },
    ])
  }

  function removeItem(index: number): void {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sortOrder: i + 1 }))
    )
  }

  async function handleSave(): Promise<void> {
    // Validate: every item needs a fullStatement
    const hasEmpty = items.some((item) => !item.fullStatement.trim())
    if (hasEmpty) {
      toast({
        title: 'ข้อมูลไม่ครบ',
        description: 'กรุณากรอกคำอธิบาย LO ทุกรายการ',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await nodeApi.put(`/courses/${courseId}/outcomes`, { outcomes: items })
      toast({
        title: 'บันทึกสำเร็จ',
        description: 'Learning Outcomes ถูกอัปเดตเรียบร้อยแล้ว',
      })
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึก Learning Outcomes ได้',
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
          {items.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" />
            เพิ่ม LO
          </Button>
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
            บันทึก
          </Button>
        </div>
      </div>

      {/* Outcome Items */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              ยังไม่มี Learning Outcome
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addItem}
            >
              <Plus className="mr-1 h-4 w-4" />
              เพิ่ม LO แรก
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-start gap-3 rounded-lg border bg-card p-4"
            >
              {/* Drag Handle & Number */}
              <div className="col-span-12 flex items-center gap-2 md:col-span-1 md:flex-col md:pt-6">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.sortOrder}
                </span>
              </div>

              {/* Full Statement */}
              <div className="col-span-12 md:col-span-4">
                <label className="mb-1 block text-sm font-medium">
                  คำอธิบาย LO
                </label>
                <Textarea
                  rows={2}
                  placeholder="ผู้เรียนสามารถ..."
                  value={item.fullStatement}
                  onChange={(e) =>
                    updateItem(index, 'fullStatement', e.target.value)
                  }
                />
              </div>

              {/* Human Coding Scheme */}
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-sm font-medium">รหัส</label>
                <Input
                  placeholder="CLO1"
                  value={item.humanCodingScheme ?? ''}
                  onChange={(e) =>
                    updateItem(index, 'humanCodingScheme', e.target.value)
                  }
                />
              </div>

              {/* Bloom Level */}
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Bloom Level
                </label>
                <Select
                  value={item.bloomLevel ?? ''}
                  onValueChange={(value) =>
                    updateItem(
                      index,
                      'bloomLevel',
                      value as OutcomeFormValues['bloomLevel']
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloomLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="col-span-6 md:col-span-2">
                <label className="mb-1 block text-sm font-medium">ลำดับ</label>
                <Input
                  type="number"
                  min={1}
                  value={item.sortOrder}
                  onChange={(e) =>
                    updateItem(index, 'sortOrder', Number(e.target.value))
                  }
                />
              </div>

              {/* Delete */}
              <div className="col-span-6 flex items-end pb-1 md:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
