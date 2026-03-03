import { IsString, IsNumber, MinLength, IsNotEmpty, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  sku!: string;

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
}
