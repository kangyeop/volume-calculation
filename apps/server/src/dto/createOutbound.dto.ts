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

  @IsOptional()
  @IsString()
  productId?: string | null;
}
