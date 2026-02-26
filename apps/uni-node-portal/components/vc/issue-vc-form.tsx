'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  GraduationCap,
  Award,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { issueVCSchema, type IssueVCFormValues } from '@/lib/schemas/vc-schemas'
import { useIssueVC } from '@/hooks/use-vcs'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const STEPS = [
  { title: 'เลือกประเภท VC', description: 'เลือกประเภทของ Credential' },
  { title: 'รหัสนักศึกษา', description: 'กรอกรหัสนักศึกษาที่ต้องการออก VC' },
  { title: 'รายละเอียด', description: 'กรอกข้อมูลรายวิชาและผลการเรียน' },
  { title: 'ตรวจสอบและยืนยัน', description: 'ตรวจสอบข้อมูลก่อนออก VC' },
] as const

const VC_TYPES = [
  {
    value: 'CourseCreditCredential' as const,
    label: 'Course Credit Credential',
    description: 'หน่วยกิตรายวิชา',
    icon: GraduationCap,
    color: 'border-blue-200 bg-blue-50 hover:border-blue-400',
    activeColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-500',
  },
  {
    value: 'DegreeCredential' as const,
    label: 'Degree Credential',
    description: 'ปริญญาบัตร',
    icon: Award,
    color: 'border-purple-200 bg-purple-50 hover:border-purple-400',
    activeColor: 'border-purple-500 bg-purple-100 ring-2 ring-purple-500',
  },
  {
    value: 'AchievementCredential' as const,
    label: 'Achievement Credential',
    description: 'ผลสัมฤทธิ์/ใบรับรอง',
    icon: Trophy,
    color: 'border-amber-200 bg-amber-50 hover:border-amber-400',
    activeColor: 'border-amber-500 bg-amber-100 ring-2 ring-amber-500',
  },
] as const

const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'S', 'U'] as const

const DELIVERY_MODES = [
  { value: 'Onsite', label: 'Onsite (เรียนในห้อง)' },
  { value: 'Online', label: 'Online (เรียนออนไลน์)' },
  { value: 'Hybrid', label: 'Hybrid (ผสมผสาน)' },
] as const

const vcTypeDisplayLabels: Record<string, string> = {
  CourseCreditCredential: 'Course Credit Credential',
  DegreeCredential: 'Degree Credential',
  AchievementCredential: 'Achievement Credential',
}

export function IssueVCForm(): React.ReactElement {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  const issueVC = useIssueVC()

  const form = useForm<IssueVCFormValues>({
    resolver: zodResolver(issueVCSchema),
    defaultValues: {
      studentId: '',
      vcType: undefined,
      courseId: '',
      grade: undefined,
      gradePoint: undefined,
      semester: undefined,
      academicYear: '',
      deliveryMode: undefined,
      note: '',
    },
  })

  const { register, setValue, watch, trigger, formState: { errors } } = form
  const watchedValues = watch()

  async function handleNext(): Promise<void> {
    let fieldsToValidate: (keyof IssueVCFormValues)[] = []

    switch (currentStep) {
      case 0:
        fieldsToValidate = ['vcType']
        break
      case 1:
        fieldsToValidate = ['studentId']
        break
      case 2:
        fieldsToValidate = ['academicYear']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
    }
  }

  function handleBack(): void {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  async function handleSubmit(): Promise<void> {
    const isValid = await trigger()
    if (!isValid) return

    try {
      await issueVC.mutateAsync(watchedValues)
      toast({
        title: 'ออก VC สำเร็จ',
        description: 'Verifiable Credential ถูกออกเรียบร้อยแล้ว',
      })
      router.push('/vcs')
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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Step Indicator */}
      <nav aria-label="ขั้นตอน">
        <ol className="flex items-center">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={cn(
                'flex items-center',
                index < STEPS.length - 1 && 'flex-1'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                    index < currentStep &&
                      'border-primary bg-primary text-primary-foreground',
                    index === currentStep &&
                      'border-primary bg-primary text-primary-foreground',
                    index > currentStep &&
                      'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'hidden text-sm font-medium sm:inline',
                    index <= currentStep
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <Separator
                  className={cn(
                    'mx-3 flex-1',
                    index < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Select VC Type */}
          {currentStep === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {VC_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = watchedValues.vcType === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setValue('vcType', type.value, { shouldValidate: true })}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all cursor-pointer',
                      isSelected ? type.activeColor : type.color
                    )}
                  >
                    <Icon className="h-8 w-8" />
                    <div>
                      <p className="font-semibold text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </div>
                  </button>
                )
              })}
              {errors.vcType && (
                <p className="col-span-full text-sm text-destructive">
                  {errors.vcType.message}
                </p>
              )}
            </div>
          )}

          {/* Step 2: Student ID */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="studentId">รหัสนักศึกษา</Label>
                <Input
                  id="studentId"
                  placeholder="เช่น 6501001234"
                  {...register('studentId')}
                />
                {errors.studentId && (
                  <p className="text-sm text-destructive">
                    {errors.studentId.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Course ID */}
                <div className="space-y-2">
                  <Label htmlFor="courseId">รหัสวิชา</Label>
                  <Input
                    id="courseId"
                    placeholder="เช่น CS101"
                    {...register('courseId')}
                  />
                  {errors.courseId && (
                    <p className="text-sm text-destructive">
                      {errors.courseId.message}
                    </p>
                  )}
                </div>

                {/* Grade */}
                <div className="space-y-2">
                  <Label>เกรด</Label>
                  <Select
                    value={watchedValues.grade ?? ''}
                    onValueChange={(val) =>
                      setValue('grade', val as IssueVCFormValues['grade'], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกเกรด" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grade && (
                    <p className="text-sm text-destructive">
                      {errors.grade.message}
                    </p>
                  )}
                </div>

                {/* Semester */}
                <div className="space-y-2">
                  <Label>ภาคเรียน</Label>
                  <Select
                    value={watchedValues.semester ?? ''}
                    onValueChange={(val) =>
                      setValue('semester', val as IssueVCFormValues['semester'], {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกภาคเรียน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                      <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
                      <SelectItem value="S">ภาคฤดูร้อน</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.semester && (
                    <p className="text-sm text-destructive">
                      {errors.semester.message}
                    </p>
                  )}
                </div>

                {/* Academic Year */}
                <div className="space-y-2">
                  <Label htmlFor="academicYear">ปีการศึกษา</Label>
                  <Input
                    id="academicYear"
                    placeholder="เช่น 2567"
                    maxLength={4}
                    {...register('academicYear')}
                  />
                  {errors.academicYear && (
                    <p className="text-sm text-destructive">
                      {errors.academicYear.message}
                    </p>
                  )}
                </div>

                {/* Delivery Mode */}
                <div className="space-y-2">
                  <Label>รูปแบบการเรียน</Label>
                  <Select
                    value={watchedValues.deliveryMode ?? ''}
                    onValueChange={(val) =>
                      setValue(
                        'deliveryMode',
                        val as IssueVCFormValues['deliveryMode'],
                        { shouldValidate: true }
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรูปแบบ" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_MODES.map((mode) => (
                        <SelectItem key={mode.value} value={mode.value}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.deliveryMode && (
                    <p className="text-sm text-destructive">
                      {errors.deliveryMode.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">หมายเหตุ</Label>
                <Textarea
                  id="note"
                  placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
                  rows={3}
                  {...register('note')}
                />
              </div>
            </div>
          )}

          {/* Step 4: Review & Confirm */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* VC Type */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  ประเภท VC
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-sm',
                    watchedValues.vcType === 'CourseCreditCredential' &&
                      'bg-blue-100 text-blue-800 border-blue-200',
                    watchedValues.vcType === 'DegreeCredential' &&
                      'bg-purple-100 text-purple-800 border-purple-200',
                    watchedValues.vcType === 'AchievementCredential' &&
                      'bg-amber-100 text-amber-800 border-amber-200'
                  )}
                >
                  {vcTypeDisplayLabels[watchedValues.vcType ?? ''] ??
                    watchedValues.vcType}
                </Badge>
              </div>

              <Separator />

              {/* Student */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  รหัสนักศึกษา
                </h4>
                <p className="font-mono">{watchedValues.studentId}</p>
              </div>

              <Separator />

              {/* Course Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  รายละเอียด
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {watchedValues.courseId && (
                    <div>
                      <span className="text-muted-foreground">รหัสวิชา:</span>
                      <span className="ml-2 font-mono">
                        {watchedValues.courseId}
                      </span>
                    </div>
                  )}
                  {watchedValues.grade && (
                    <div>
                      <span className="text-muted-foreground">เกรด:</span>
                      <span className="ml-2 font-semibold">
                        {watchedValues.grade}
                      </span>
                    </div>
                  )}
                  {watchedValues.semester && (
                    <div>
                      <span className="text-muted-foreground">ภาคเรียน:</span>
                      <span className="ml-2">
                        {watchedValues.semester === 'S'
                          ? 'ภาคฤดูร้อน'
                          : `ภาคเรียนที่ ${watchedValues.semester}`}
                      </span>
                    </div>
                  )}
                  {watchedValues.academicYear && (
                    <div>
                      <span className="text-muted-foreground">
                        ปีการศึกษา:
                      </span>
                      <span className="ml-2">{watchedValues.academicYear}</span>
                    </div>
                  )}
                  {watchedValues.deliveryMode && (
                    <div>
                      <span className="text-muted-foreground">รูปแบบ:</span>
                      <span className="ml-2">
                        {watchedValues.deliveryMode}
                      </span>
                    </div>
                  )}
                </div>
                {watchedValues.note && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">หมายเหตุ:</span>
                    <p className="mt-1 rounded-md bg-muted p-2 text-sm">
                      {watchedValues.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ย้อนกลับ
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext}>
            ถัดไป
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={issueVC.isPending}
          >
            {issueVC.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังออก VC...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                ยืนยันออก VC
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
