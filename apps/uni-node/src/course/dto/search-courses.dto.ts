import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class SearchCoursesDto {
  @IsString()
  @IsNotEmpty({ message: 'Search query (q) is required' })
  q!: string

  @IsString()
  @IsOptional()
  faculty?: string

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  credits?: number

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
