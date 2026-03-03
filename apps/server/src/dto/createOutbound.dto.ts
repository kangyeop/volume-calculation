import { IsString, IsInt, IsPositive, IsOptional } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsInt()
  orderQty?: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  productId?: string | null;
}
