import { IsOptional, IsInt, IsString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class ListExternalQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @IsOptional()
  @IsString()
  status?: string
}
