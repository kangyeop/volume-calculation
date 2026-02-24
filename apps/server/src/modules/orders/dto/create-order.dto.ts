import { IsString, IsOptional, IsEnum, MinLength, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  orderId!: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
