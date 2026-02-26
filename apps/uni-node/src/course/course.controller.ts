import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common'
import { CourseService } from './course.service'
import type { LOMatchResult } from './course.service'
import { ListCoursesDto } from './dto/list-courses.dto'
import { SearchCoursesDto } from './dto/search-courses.dto'
import { VerifyCourseIntegrityDto } from './dto/verify-course-integrity.dto'
import { LOMatchQueryDto } from './dto/lo-match-query.dto'
import type {
  ApiResponse,
  LISCourseTemplate,
  CASEDocument,
  CourseSyllabus,
  SchemaOrgCourse,
  PaginatedResponse,
} from '@unilink/dto'

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  // ─── Static Routes (must be BEFORE :courseId) ───────────

  /**
   * GET /courses — List courses with pagination and filters
   */
  @Get()
  async listCourses(
    @Query() dto: ListCoursesDto,
  ): Promise<ApiResponse<PaginatedResponse<LISCourseTemplate>>> {
    const result = await this.courseService.listCourses(dto)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /courses/verify-integrity — Verify course data integrity
   */
  @Post('verify-integrity')
  async verifyCourseIntegrity(
    @Body() dto: VerifyCourseIntegrityDto,
  ): Promise<ApiResponse<{ isValid: boolean; verifiedAt: string; error?: string }>> {
    const result = await this.courseService.verifyCourseIntegrity(dto)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /courses/search — Keyword search
   * IMPORTANT: Must be before :courseId route to avoid "search" matching as courseId
   */
  @Get('search')
  async searchCourses(
    @Query() dto: SearchCoursesDto,
  ): Promise<ApiResponse<PaginatedResponse<LISCourseTemplate>>> {
    const result = await this.courseService.searchCourses(dto)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  // ─── Parameterized Routes ──────────────────────────────

  /**
   * GET /courses/:courseId — Full course detail (LIS v2.0 + integrity)
   */
  @Get(':courseId')
  async getCourse(
    @Param('courseId') courseId: string,
  ): Promise<ApiResponse<LISCourseTemplate>> {
    const result = await this.courseService.getCourse(courseId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /courses/:courseId/outcomes — Learning Outcomes (CASE v1.1)
   */
  @Get(':courseId/outcomes')
  async getOutcomes(
    @Param('courseId') courseId: string,
  ): Promise<ApiResponse<CASEDocument>> {
    const result = await this.courseService.getOutcomes(courseId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /courses/:courseId/syllabus — Weekly syllabus
   */
  @Get(':courseId/syllabus')
  async getSyllabus(
    @Param('courseId') courseId: string,
  ): Promise<ApiResponse<CourseSyllabus[]>> {
    const result = await this.courseService.getSyllabus(courseId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /courses/:courseId/schema — Schema.org/Course format (external API)
   */
  @Get(':courseId/schema')
  async getSchemaOrg(
    @Param('courseId') courseId: string,
  ): Promise<ApiResponse<SchemaOrgCourse>> {
    const result = await this.courseService.getSchemaOrg(courseId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /courses/:courseId/lo-match — Calculate LO match percentage
   */
  @Get(':courseId/lo-match')
  async calculateLOMatch(
    @Param('courseId') courseId: string,
    @Query() dto: LOMatchQueryDto,
  ): Promise<ApiResponse<LOMatchResult>> {
    const result = await this.courseService.calculateLOMatch(courseId, dto.targetCourseId)
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }
  }
}
