import { IsString, IsInt } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId!: string;

  @IsString()
  sku!: string;

  @IsInt()
  quantity!: number;

  @IsString()
  productId!: string;
}
