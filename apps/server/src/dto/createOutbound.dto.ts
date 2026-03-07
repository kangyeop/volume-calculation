import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId!: string;

  @IsString()
  sku!: string;

  @IsInt()
  quantity!: number;

  @IsString()
  @IsOptional()
  productId?: string;
}
