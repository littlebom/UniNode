import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator'

export class ApproveExternalDto {
  @IsString()
  @IsNotEmpty({ message: 'Recognized course ID is required' })
  recognizedCourseId!: string

  @IsInt()
  @Min(1, { message: 'Recognized credits must be at least 1' })
  @Max(12, { message: 'Recognized credits must not exceed 12' })
  recognizedCredits!: number

  @IsOptional()
  @IsString()
  note?: string
}
