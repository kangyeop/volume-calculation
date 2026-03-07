import { IsString, IsNotEmpty, IsArray, IsObject, IsInt } from 'class-validator';

export class OutboundItemDto {
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsInt()
  @IsNotEmpty()
  quantity!: number;

  @IsString()
  productId?: string;
}

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsArray()
  @IsObject({ each: true })
  outbounds!: OutboundItemDto[];
}
