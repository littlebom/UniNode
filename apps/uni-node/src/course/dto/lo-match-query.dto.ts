import { IsString, IsNotEmpty } from 'class-validator'

export class LOMatchQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Target Course ID (targetCourseId) is required' })
  targetCourseId!: string
}
