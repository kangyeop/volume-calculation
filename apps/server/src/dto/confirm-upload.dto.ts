import { IsString, IsNotEmpty, IsArray, IsObject } from 'class-validator';

export class OutboundItemDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsNotEmpty()
  quantity!: number;

  recipientName?: string;

  address?: string;

  productId?: string | null;
}

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsArray()
  @IsObject({ each: true })
  orders!: OutboundItemDto[];
}
