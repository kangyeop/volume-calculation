import { IsEnum } from 'class-validator';
import { PackingGroupingOption } from '@wms/types';

export class CalculatePackingDto {
  @IsEnum(PackingGroupingOption)
  groupingOption!: PackingGroupingOption;
}
