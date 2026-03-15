import { IsIn } from 'class-validator';
import { PackingGroupingOption } from '@wms/types';

export class CalculatePackingDto {
  @IsIn(['ORDER', 'RECIPIENT', 'ORDER_RECIPIENT'])
  groupingOption!: PackingGroupingOption;
}
