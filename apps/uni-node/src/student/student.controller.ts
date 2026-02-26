import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common'
import { StudentService } from './student.service'
import { StudentEntity } from './student.entity'
import { QueryStudentDto } from './dto/query-student.dto'
import type { ApiResponse, PaginatedResponse } from '@unilink/dto'

interface StudentInfo {
  id: string
  studentId: string
  did: string | null
  status: string
  enrolledAt: string | null
  createdAt: string
}

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  async findAll(@Query() query: QueryStudentDto): Promise<ApiResponse<PaginatedResponse<StudentInfo>>> {
    const result = await this.studentService.findAll(query)
    return {
      success: true,
      data: {
        data: result.data.map((s) => this.toStudentInfo(s)),
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
      timestamp: new Date().toISOString(),
    }
  }

  @Get(':studentId')
  async findOne(@Param('studentId') studentId: string): Promise<ApiResponse<StudentInfo>> {
    const student = await this.studentService.findByStudentId(studentId)
    return {
      success: true,
      data: this.toStudentInfo(student),
      timestamp: new Date().toISOString(),
    }
  }

  private toStudentInfo(entity: StudentEntity): StudentInfo {
    return {
      id: entity.id,
      studentId: entity.studentId,
      did: entity.did,
      status: entity.status,
      enrolledAt: entity.enrolledAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
    }
  }
}
