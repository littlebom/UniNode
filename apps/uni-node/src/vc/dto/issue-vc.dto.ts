import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  Matches,
} from 'class-validator'

export enum DeliveryMode {
  Onsite = 'Onsite',
  Online = 'Online',
  Hybrid = 'Hybrid',
}

export class IssueVcDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string

  @IsString()
  @IsOptional()
  vcType?: string

  @IsString()
  @IsNotEmpty()
  courseId!: string

  @IsString()
  @Matches(/^(A|B\+|B|C\+|C|D\+|D|F|S|U)$/, {
    message: 'grade must be one of: A, B+, B, C+, C, D+, D, F, S, U',
  })
  grade!: string

  @IsNumber()
  @Min(0)
  @Max(4)
  gradePoint!: number

  @IsString()
  @Matches(/^(1|2|S)$/, {
    message: 'semester must be 1, 2, or S',
  })
  semester!: string

  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'academicYear must be a 4-digit Buddhist Era year (e.g., 2567)',
  })
  academicYear!: string

  @IsEnum(DeliveryMode)
  @IsOptional()
  deliveryMode?: DeliveryMode
}
