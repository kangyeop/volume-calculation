import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export interface ProductMappingItem {
  productIds?: string[];
}

export class ConfirmMappingUploadDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsObject()
  columnMapping!: Record<string, string | null>;

  @IsObject()
  @IsOptional()
  productMapping?: Record<number, ProductMappingItem>;
}
