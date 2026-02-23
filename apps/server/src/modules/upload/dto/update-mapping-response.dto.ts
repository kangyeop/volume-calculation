import { ApiProperty } from '@nestjs/swagger';

export class ProductMatchResultDto {
  @ApiProperty({
    description: 'Index of the outbound item',
    example: 0,
  })
  outboundItemIndex!: number;

  @ApiProperty({
    description: 'Matched product IDs',
    required: false,
    type: [String],
    example: ['prod_123', 'prod_456'],
  })
  productIds?: string[];
}

export class ProductMappingDataDto {
  @ApiProperty({
    description: 'Product matching results',
    type: [ProductMatchResultDto],
  })
  results!: ProductMatchResultDto[];
}

export class UpdateMappingDataDto {
  @ApiProperty({
    description: 'Product mapping results',
    type: ProductMappingDataDto,
  })
  productMapping!: ProductMappingDataDto;
}

export class UpdateMappingResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Update mapping data',
    type: UpdateMappingDataDto,
  })
  data!: UpdateMappingDataDto;
}
