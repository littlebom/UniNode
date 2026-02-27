import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateTransferDto {
  @IsString()
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId!: string

  @IsString()
  @IsNotEmpty({ message: 'Source VC ID is required' })
  sourceVcId!: string

  @IsString()
  @IsNotEmpty({ message: 'Source Course ID is required' })
  sourceCourseId!: string

  @IsString()
  @IsNotEmpty({ message: 'Target Node ID is required' })
  targetNodeId!: string

  @IsString()
  @IsOptional()
  targetCourseId?: string

  /** Central DID of the student (did:web:unilink.ac.th:id:{uuid}) */
  @IsString()
  @IsOptional()
  studentDid?: string
}
