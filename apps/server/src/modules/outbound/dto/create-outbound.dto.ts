import { IsString, IsInt, IsPositive, IsOptional } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId!: string;

  @IsString()
  sku!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  recipientName?: string;
}
