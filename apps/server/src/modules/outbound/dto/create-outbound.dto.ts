import { IsString, IsInt, IsPositive } from 'class-validator';

export class CreateOutboundDto {
  @IsString()
  orderId: string;

  @IsString()
  sku: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
