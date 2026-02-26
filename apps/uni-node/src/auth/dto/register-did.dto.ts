import { IsString, MinLength, MaxLength, Matches } from 'class-validator'

export class RegisterDidDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  studentId!: string

  @IsString()
  @Matches(/^did:web:.+:students:.+$/, {
    message: 'DID must match format did:web:<domain>:students:<studentId>',
  })
  did!: string

  @IsString()
  @Matches(/^z/, {
    message: 'publicKey must start with "z" (multibase-encoded)',
  })
  publicKey!: string
}
