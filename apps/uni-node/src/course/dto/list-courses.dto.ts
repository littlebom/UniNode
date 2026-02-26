import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class ListCoursesDto {
  @IsString()
  @IsOptional()
  faculty?: string

  @IsString()
  @IsOptional()
  deliveryMode?: string

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  credits?: number

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  isActive?: boolean

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number
}
