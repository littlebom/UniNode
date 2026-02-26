import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CryptoModule } from '../crypto/crypto.module'
import { CourseEntity } from './entities/course.entity'
import { CourseOfferingEntity } from './entities/course-offering.entity'
import { CourseOutcomeEntity } from './entities/course-outcome.entity'
import { CourseSyllabusEntity } from './entities/course-syllabus.entity'
import { CourseAssessmentEntity } from './entities/course-assessment.entity'
import { CourseRepository } from './course.repository'
import { CourseService } from './course.service'
import { CourseController } from './course.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEntity,
      CourseOfferingEntity,
      CourseOutcomeEntity,
      CourseSyllabusEntity,
      CourseAssessmentEntity,
    ]),
    CryptoModule,
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}
