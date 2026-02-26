import { IsString, IsOptional } from 'class-validator'

export class RejectExternalDto {
  @IsOptional()
  @IsString()
  note?: string
}
