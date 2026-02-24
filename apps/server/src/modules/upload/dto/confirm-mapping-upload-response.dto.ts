import { ApiProperty } from '@nestjs/swagger';
import { ConfirmMappingUploadResponse, ConfirmMappingUploadData } from '@wms/types';

export class ConfirmMappingUploadDataDto implements ConfirmMappingUploadData {
  @ApiProperty({
    description: 'Number of items imported',
    example: 50,
  })
  imported!: number;

  @ApiProperty({
    description: 'Batch ID for tracking',
    required: false,
    example: 'batch_123',
  })
  batchId?: string;

  @ApiProperty({
    description: 'Number of items successfully mapped to products',
    example: 45,
  })
  mappedCount!: number;

  @ApiProperty({
    description: 'Number of items that could not be mapped',
    example: 5,
  })
  unmappedCount!: number;

  @ApiProperty({
    description: 'List of unique order IDs in the batch',
    required: false,
    example: ['ORD001', 'ORD002'],
  })
  orderIds?: string[];
}

export class ConfirmMappingUploadResponseDto implements ConfirmMappingUploadResponse {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Upload confirmation data',
    type: ConfirmMappingUploadDataDto,
  })
  data!: ConfirmMappingUploadDataDto;
}
