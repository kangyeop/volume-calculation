import { ApiProperty } from '@nestjs/swagger';
import { OutboundUploadResult } from '@wms/types';

export class OutboundUnmatchedItemDto {
  @ApiProperty({
    description: 'SKU of the unmatched item',
    example: 'SKU-123',
  })
  sku!: string;

  @ApiProperty({
    description: 'Raw value from the upload',
    example: 'SKU-123-RAW',
    required: false,
  })
  rawValue?: string;

  @ApiProperty({
    description: 'Quantity of the unmatched item',
    example: 10,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Reason why the item was unmatched',
    example: 'Product not found',
    required: false,
  })
  reason?: string;
}

export class OutboundUploadResultDto implements OutboundUploadResult {
  @ApiProperty({
    description: 'Number of items successfully imported',
    example: 100,
  })
  imported!: number;

  @ApiProperty({
    description: 'List of unmatched items',
    type: [OutboundUnmatchedItemDto],
  })
  unmatched!: OutboundUnmatchedItemDto[];

  @ApiProperty({
    description: 'Total number of rows processed',
    example: 110,
  })
  totalRows!: number;

  @ApiProperty({
    description: 'Name of the batch',
    example: 'Batch 2024-01-01',
  })
  batchName!: string;

  @ApiProperty({
    description: 'ID of the batch',
    example: 'uuid-here',
  })
  batchId!: string;
}

export class OutboundUploadResultResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Outbound upload result data',
    type: OutboundUploadResultDto,
  })
  data!: OutboundUploadResultDto;
}
