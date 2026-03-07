import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId!: string;

  @IsString()
  sku!: string;

  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  productId!: string;
}
