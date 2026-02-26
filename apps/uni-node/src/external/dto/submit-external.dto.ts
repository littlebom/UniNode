import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator'

export class SubmitExternalDto {
  @IsString()
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId!: string

  @IsString()
  @IsNotEmpty({ message: 'Platform is required' })
  platform!: string

  @IsString()
  @IsNotEmpty({ message: 'Course name is required' })
  courseName!: string

  @IsString()
  @IsNotEmpty({ message: 'Institution is required' })
  institution!: string

  @IsDateString({}, { message: 'Completion date must be a valid ISO date string' })
  completionDate!: string

  @IsOptional()
  @IsNumber({}, { message: 'Score must be a number' })
  @Min(0)
  @Max(100)
  score?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  completionHours?: number

  @IsOptional()
  @IsString()
  certificateUrl?: string

  @IsOptional()
  @IsString()
  certificatePdfUrl?: string

  @IsOptional()
  @IsString()
  verificationUrl?: string

  @IsOptional()
  @IsString()
  requestedCourseId?: string

  @IsOptional()
  @IsString()
  originalVcId?: string
}
