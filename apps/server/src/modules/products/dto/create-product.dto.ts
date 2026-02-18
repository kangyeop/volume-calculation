import {
  IsString,
  IsNumber,
  MinLength,
  IsNotEmpty,
  Min,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';

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

  @IsNumber()
  @Min(0)
  weight!: number;

  @IsOptional()
  @IsDateString()
  inboundDate?: string;

  @IsOptional()
  @IsDateString()
  outboundDate?: string;

  @IsOptional()
  @IsBoolean()
  barcode?: boolean;

  @IsOptional()
  @IsBoolean()
  aircap?: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
