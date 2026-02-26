import { IsString, IsNotEmpty } from 'class-validator'

export class RevokeVcDto {
  @IsString()
  @IsNotEmpty({ message: 'Revocation reason is required' })
  reason!: string
}
