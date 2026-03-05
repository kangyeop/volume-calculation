import { IsString, IsOptional } from 'class-validator';

export class CalculateOrderPackingDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  groupLabel?: string;
}
