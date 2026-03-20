import { IsString, IsNumber, Min } from 'class-validator';

export class UpdateBoxAssignmentDto {
  @IsNumber()
  @Min(0)
  groupIndex!: number;

  @IsNumber()
  @Min(0)
  boxIndex!: number;

  @IsString()
  newBoxId!: string;
}
