'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useStudentProfile } from '@/hooks/use-students'
import { StudentProfileView } from '@/components/student/student-profile'

interface StudentDetailPageProps {
  params: Promise<{ studentId: string }>
}

export default function StudentDetailPage({
  params,
}: StudentDetailPageProps): React.ReactElement {
  const { studentId } = use(params)
  const router = useRouter()
  const { data: profile, isLoading } = useStudentProfile(studentId)

  return (
    <div className="space-y-6">
      {/* Back Button + Title */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/students')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">กลับ</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            โปรไฟล์นักศึกษา
          </h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-48" />
          ) : profile ? (
            <p className="text-sm text-muted-foreground">
              รหัสนักศึกษา: {profile.studentId}
            </p>
          ) : null}
        </div>
      </div>

      {/* Profile */}
      {isLoading ? (
        <StudentProfileView
          profile={{} as never}
          isLoading={true}
        />
      ) : profile ? (
        <StudentProfileView profile={profile} isLoading={false} />
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            ไม่พบข้อมูลนักศึกษา
          </p>
        </div>
      )}
    </div>
  )
}
