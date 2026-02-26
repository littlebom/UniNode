import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryStudentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'graduated', 'suspended'])
  status?: string
}
