import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CalculateOrderPackingDto {
  @IsUUID()
  orderId!: string;

  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsString()
  groupLabel?: string;
}
