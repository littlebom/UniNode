import { IsString, IsNotEmpty, IsObject, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class IntegrityDto {
  @IsString()
  @IsNotEmpty()
  hash!: string

  @IsString()
  @IsNotEmpty()
  signature!: string

  @IsString()
  @IsNotEmpty()
  signingKey!: string
}

export class VerifyCourseIntegrityDto {
  @IsObject()
  courseData!: Record<string, unknown>

  @ValidateNested()
  @Type(() => IntegrityDto)
  integrity!: IntegrityDto
}
