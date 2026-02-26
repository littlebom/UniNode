import { IsOptional, IsInt, Min, Max, IsString, IsIn, MinLength, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryVcDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  studentId!: string

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
  @IsIn(['active', 'revoked'])
  status?: string
}
