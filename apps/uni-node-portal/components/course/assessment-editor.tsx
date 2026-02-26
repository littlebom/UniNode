'use client'

import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { AssessmentFormValues } from '@/lib/schemas/course-schemas'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AssessmentEditorProps {
  assessments: AssessmentFormValues[]
  onChange: (assessments: AssessmentFormValues[]) => void
}

export function AssessmentEditor({
  assessments,
  onChange,
}: AssessmentEditorProps): React.ReactElement {
  const totalWeight = assessments.reduce((sum, a) => sum + (a.weight ?? 0), 0)
  const isValid = totalWeight === 100
  const hasItems = assessments.length > 0

  function addRow(): void {
    onChange([...assessments, { type: '', weight: 0 }])
  }

  function removeRow(index: number): void {
    onChange(assessments.filter((_, i) => i !== index))
  }

  function updateRow(
    index: number,
    field: keyof AssessmentFormValues,
    value: string | number
  ): void {
    onChange(
      assessments.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            น้ำหนักรวม:
          </span>
          <Badge
            variant="outline"
            className={cn(
              isValid && hasItems
                ? 'border-green-200 bg-green-100 text-green-800'
                : hasItems
                  ? 'border-amber-200 bg-amber-100 text-amber-800'
                  : ''
            )}
          >
            {isValid && hasItems ? (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : hasItems ? (
              <AlertTriangle className="mr-1 h-3 w-3" />
            ) : null}
            {totalWeight}%
          </Badge>
          {hasItems && !isValid && (
            <span className="text-xs text-amber-600">
              น้ำหนักรวมต้องเท่ากับ 100%
            </span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มรายการ
        </Button>
      </div>

      {/* Assessment Rows */}
      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
          <p className="text-sm text-muted-foreground">
            ยังไม่มีรายการประเมิน
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={addRow}
          >
            <Plus className="mr-1 h-4 w-4" />
            เพิ่มรายการแรก
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-3 px-1">
            <div className="col-span-7">
              <span className="text-xs font-medium text-muted-foreground">
                ประเภทการประเมิน
              </span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-medium text-muted-foreground">
                น้ำหนัก (%)
              </span>
            </div>
            <div className="col-span-2" />
          </div>

          {assessments.map((assessment, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="col-span-7">
                <Input
                  placeholder="เช่น สอบกลางภาค, สอบปลายภาค, งานกลุ่ม"
                  value={assessment.type}
                  onChange={(e) => updateRow(index, 'type', e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={assessment.weight}
                    onChange={(e) =>
                      updateRow(index, 'weight', Number(e.target.value))
                    }
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div className="col-span-2 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Total Bar */}
          <div className="grid grid-cols-12 items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <div className="col-span-7 text-right">
              <span className="text-sm font-medium">รวม</span>
            </div>
            <div className="col-span-3">
              <span
                className={cn(
                  'text-sm font-bold',
                  isValid ? 'text-green-600' : 'text-amber-600'
                )}
              >
                {totalWeight}%
              </span>
            </div>
            <div className="col-span-2" />
          </div>
        </div>
      )}
    </div>
  )
}
