import { IsString, IsOptional } from 'class-validator'

export class ReviewTransferDto {
  @IsString()
  @IsOptional()
  reviewNote?: string
}
