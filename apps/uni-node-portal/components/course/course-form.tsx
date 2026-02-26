'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useCreateCourse, useUpdateCourse } from '@/hooks/use-courses'
import { courseFormSchema } from '@/lib/schemas/course-schemas'
import type { CourseFormValues } from '@/lib/schemas/course-schemas'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Form,
  FormControl,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssessmentEditor } from '@/components/course/assessment-editor'
import type { AssessmentFormValues } from '@/lib/schemas/course-schemas'

interface CourseFormProps {
  mode: 'create' | 'edit'
  defaultValues?: Partial<CourseFormValues>
  courseId?: string
}

const bloomLevels = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
] as const

export function CourseForm({
  mode,
  defaultValues,
  courseId,
}: CourseFormProps): React.ReactElement {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('general')

  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse(courseId ?? '')

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      courseId: '',
      courseName: '',
      courseNameTH: '',
      credits: 3,
      courseType: '',
      deliveryMode: 'Onsite',
      faculty: '',
      department: '',
      description: '',
      descriptionTH: '',
      prerequisites: [],
      language: 'th',
      outcomes: [],
      syllabus: [],
      assessments: [],
      ...defaultValues,
    },
  })

  const {
    fields: outcomeFields,
    append: appendOutcome,
    remove: removeOutcome,
  } = useFieldArray({
    control: form.control,
    name: 'outcomes',
  })

  const {
    fields: syllabusFields,
    append: appendSyllabus,
    remove: removeSyllabus,
  } = useFieldArray({
    control: form.control,
    name: 'syllabus',
  })

  const isSubmitting = createCourse.isPending || updateCourse.isPending

  async function onSubmit(values: CourseFormValues): Promise<void> {
    try {
      if (mode === 'create') {
        await createCourse.mutateAsync(values)
        toast({
          title: 'สร้างวิชาสำเร็จ',
          description: `วิชา ${values.courseId} ถูกสร้างเรียบร้อยแล้ว`,
        })
      } else {
        await updateCourse.mutateAsync(values)
        toast({
          title: 'อัปเดตวิชาสำเร็จ',
          description: `วิชา ${values.courseId} ถูกอัปเดตเรียบร้อยแล้ว`,
        })
      }
      router.push('/courses')
    } catch {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: mode === 'create'
          ? 'ไม่สามารถสร้างวิชาได้ กรุณาลองใหม่อีกครั้ง'
          : 'ไม่สามารถอัปเดตวิชาได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      })
    }
  }

  function handlePopulateSyllabus(): void {
    const currentSyllabus = form.getValues('syllabus') ?? []
    const existingWeeks = new Set(currentSyllabus.map((s) => s.week))

    for (let week = 1; week <= 16; week++) {
      if (!existingWeeks.has(week)) {
        appendSyllabus({ week, topic: '', description: '' })
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
            <TabsTrigger value="outcomes">Learning Outcomes</TabsTrigger>
            <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
            <TabsTrigger value="assessment">การประเมิน</TabsTrigger>
          </TabsList>

          {/* Tab 1: General Information */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลทั่วไป</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสวิชา</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น CS101"
                            disabled={mode === 'edit'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="credits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>หน่วยกิต</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="courseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อวิชา (EN)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Introduction to Computer Science"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseNameTH"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อวิชา (TH)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="วิทยาการคอมพิวเตอร์เบื้องต้น"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="courseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประเภทวิชา</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น Lecture, Laboratory, Seminar"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รูปแบบการสอน</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกรูปแบบ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Onsite">Onsite</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="faculty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>คณะ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น คณะวิศวกรรมศาสตร์"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ภาควิชา</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="เช่น ภาควิชาวิทยาการคอมพิวเตอร์"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>คำอธิบายวิชา (EN)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Course description in English..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descriptionTH"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>คำอธิบายวิชา (TH)</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="คำอธิบายรายวิชาภาษาไทย..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ภาษาที่สอน</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="เช่น th, en, th/en"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Learning Outcomes */}
          <TabsContent value="outcomes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Learning Outcomes</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendOutcome({
                      fullStatement: '',
                      humanCodingScheme: '',
                      bloomLevel: undefined,
                      sortOrder: outcomeFields.length + 1,
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  เพิ่ม LO
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {outcomeFields.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    ยังไม่มี Learning Outcome กดปุ่ม &quot;เพิ่ม LO&quot; เพื่อเริ่มต้น
                  </p>
                ) : (
                  outcomeFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 items-start gap-3 rounded-lg border p-4"
                    >
                      <div className="col-span-12 md:col-span-5">
                        <FormField
                          control={form.control}
                          name={`outcomes.${index}.fullStatement`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>คำอธิบาย LO</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={2}
                                  placeholder="ผู้เรียนสามารถ..."
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`outcomes.${index}.humanCodingScheme`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>รหัส</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="CLO1"
                                  {...f}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`outcomes.${index}.bloomLevel`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Bloom Level</FormLabel>
                              <Select
                                onValueChange={f.onChange}
                                defaultValue={f.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="เลือก" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {bloomLevels.map((level) => (
                                    <SelectItem key={level} value={level}>
                                      {level}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-6 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`outcomes.${index}.sortOrder`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>ลำดับ</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...f}
                                  onChange={(e) =>
                                    f.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-6 md:col-span-1 flex items-end pb-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeOutcome(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Syllabus */}
          <TabsContent value="syllabus">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Syllabus (16 สัปดาห์)</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePopulateSyllabus}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  เติม 16 สัปดาห์
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {syllabusFields.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    ยังไม่มีข้อมูล Syllabus กดปุ่ม &quot;เติม 16 สัปดาห์&quot; เพื่อเริ่มต้น
                  </p>
                ) : (
                  syllabusFields
                    .sort((a, b) => a.week - b.week)
                    .map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 items-start gap-3 rounded-lg border p-3"
                      >
                        <div className="col-span-1 flex items-center justify-center pt-8">
                          <span className="text-sm font-bold text-muted-foreground">
                            W{form.getValues(`syllabus.${index}.week`)}
                          </span>
                        </div>

                        <div className="col-span-4">
                          <FormField
                            control={form.control}
                            name={`syllabus.${index}.topic`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>หัวข้อ</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="หัวข้อการสอน"
                                    {...f}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-6">
                          <FormField
                            control={form.control}
                            name={`syllabus.${index}.description`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>รายละเอียด</FormLabel>
                                <FormControl>
                                  <Textarea
                                    rows={1}
                                    placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                                    {...f}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="col-span-1 flex items-end pb-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeSyllabus(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Assessment */}
          <TabsContent value="assessment">
            <Card>
              <CardHeader>
                <CardTitle>การประเมิน</CardTitle>
              </CardHeader>
              <CardContent>
                <AssessmentEditor
                  assessments={form.watch('assessments') ?? []}
                  onChange={(assessments) =>
                    form.setValue('assessments', assessments, {
                      shouldValidate: true,
                    })
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/courses')}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'สร้างวิชา' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
