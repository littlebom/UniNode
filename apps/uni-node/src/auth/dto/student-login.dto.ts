import { IsString, MinLength, MaxLength } from 'class-validator'

export class StudentLoginDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  studentId!: string

  @IsString()
  @MinLength(1)
  password!: string
}
