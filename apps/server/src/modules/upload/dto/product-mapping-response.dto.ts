import { ApiProperty } from '@nestjs/swagger';
import { ProductMatchResult, ProductMappingData } from '@wms/types';

export class ProductMatchResultDto implements ProductMatchResult {
  @ApiProperty({
    description: 'Index of the outbound item',
    example: 0,
  })
  outboundItemIndex!: number;

  @ApiProperty({
    description: 'Order ID',
    required: false,
    example: 'ORD-001',
  })
  orderId?: string;

  @ApiProperty({
    description: 'Matched product IDs',
    required: false,
    type: [String],
    nullable: true,
    example: ['prod_123', 'prod_456'],
  })
  productIds?: string[] | null;
}

export class ProductMappingDataDto implements ProductMappingData {
  @ApiProperty({
    description: 'Product matching results',
    type: [ProductMatchResultDto],
  })
  results!: ProductMatchResultDto[];
}

export class ProductMappingResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Update mapping data',
    type: ProductMappingDataDto,
  })
  data!: ProductMappingDataDto;
}
