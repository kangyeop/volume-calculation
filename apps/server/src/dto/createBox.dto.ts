import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsUUID } from 'class-validator';

export class CreateBoxDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  width!: number;

  @IsNumber()
  @Min(0)
  length!: number;

  @IsNumber()
  @Min(0)
  height!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsUUID()
  boxGroupId?: string;
}
