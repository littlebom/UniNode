import { IsString, IsNotEmpty } from 'class-validator'

export class ChallengeDto {
  @IsString()
  @IsNotEmpty({ message: 'Domain is required' })
  domain!: string
}
