import { IsString, IsNotEmpty, IsArray, IsObject, IsInt, IsOptional } from 'class-validator';

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
  @IsOptional()
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
