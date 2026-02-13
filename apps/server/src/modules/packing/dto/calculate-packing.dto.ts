import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PackingGroupingOption } from '@wms/types';

export class CalculatePackingDto {
  @IsEnum(PackingGroupingOption)
  groupingOption: PackingGroupingOption;

  @IsOptional()
  @IsString()
  batchId?: string;
}
