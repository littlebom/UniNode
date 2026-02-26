import { IsString, IsNotEmpty, IsObject, IsUUID } from 'class-validator'
import type { VerifiablePresentation } from '@unilink/dto'

export class VerifyVpDto {
  @IsObject()
  @IsNotEmpty({ message: 'VP is required' })
  vp!: VerifiablePresentation

  @IsString()
  @IsUUID('4', { message: 'Challenge must be a valid UUID v4' })
  challenge!: string

  @IsString()
  @IsNotEmpty({ message: 'Domain is required' })
  domain!: string
}
