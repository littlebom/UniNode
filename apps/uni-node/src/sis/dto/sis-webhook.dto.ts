import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEnum,
  IsISO8601,
  Matches,
} from 'class-validator'
import { DeliveryMode } from '../../vc/dto/issue-vc.dto'

export type SisWebhookEvent = 'grade.recorded' | 'grade.updated' | 'grade.cancelled'

export class SisWebhookDto {
  @IsIn(['grade.recorded', 'grade.updated', 'grade.cancelled'])
  event!: SisWebhookEvent

  @IsString()
  @IsNotEmpty()
  studentId!: string

  @IsString()
  @IsNotEmpty()
  courseId!: string

  @IsOptional()
  @IsString()
  offeringId?: string

  @IsString()
  @Matches(/^(A|B\+|B|C\+|C|D\+|D|F|S|U)$/, {
    message: 'grade must be one of: A, B+, B, C+, C, D+, D, F, S, U',
  })
  grade!: string

  @IsString()
  @Matches(/^(1|2|S)$/, {
    message: 'semester must be 1, 2, or S',
  })
  semester!: string

  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'academicYear must be a 4-digit Buddhist Era year',
  })
  academicYear!: string

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode

  @IsISO8601()
  recordedAt!: string

  @IsOptional()
  @IsString()
  recordedBy?: string
}
