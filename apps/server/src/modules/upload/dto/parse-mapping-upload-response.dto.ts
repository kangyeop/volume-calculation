import { ApiProperty } from '@nestjs/swagger';
import {
  ColumnMapping,
  MappingResult,
  ProductMatchResult,
  ProductMappingData,
  ParseMappingUploadResponse,
  ParseMappingUploadData,
} from '@wms/types';

export class ColumnMappingDto implements ColumnMapping {
  @ApiProperty({
    description: 'Column name from the Excel file',
    example: '주문번호',
  })
  columnName!: string;

  @ApiProperty({
    description: 'Confidence score for the mapping (0-1)',
    example: 0.95,
  })
  confidence!: number;
}

export class MappingResultDto implements MappingResult {
  @ApiProperty({
    description: 'Overall confidence score for the mapping',
    example: 0.92,
  })
  confidence!: number;

  @ApiProperty({
    description: 'Field to column mapping',
    type: 'object',
    additionalProperties: {
      oneOf: [{ $ref: '#/components/schemas/ColumnMappingDto' }, { type: 'null' }],
    },
  })
  mapping!: Record<string, ColumnMappingDto | null>;

  @ApiProperty({
    description: 'Columns that could not be mapped',
    type: [String],
    example: ['메모'],
  })
  unmappedColumns!: string[];

  @ApiProperty({
    description: 'Additional notes from the AI mapping',
    required: false,
    example: 'Some columns may require manual verification',
  })
  notes?: string;
}

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

export class ParseMappingUploadDataDto implements ParseMappingUploadData {
  @ApiProperty({
    description: 'Session ID for subsequent requests',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId!: string;

  @ApiProperty({
    description: 'Headers from the Excel file',
    type: [String],
    example: ['주문번호', 'SKU', '수량', '수령인'],
  })
  headers!: string[];

  @ApiProperty({
    description: 'Number of rows in the Excel file',
    example: 100,
  })
  rowCount!: number;

  @ApiProperty({
    description: 'AI-suggested column mapping',
    type: MappingResultDto,
  })
  columnMapping!: MappingResultDto;

  @ApiProperty({
    description: 'Product mapping results',
    required: false,
    type: ProductMappingDataDto,
  })
  productMapping?: ProductMappingDataDto;

  @ApiProperty({
    description: 'Original filename',
    example: 'orders.xlsx',
  })
  fileName!: string;
}

export class ParseMappingUploadResponseDto implements ParseMappingUploadResponse {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Parsed upload data',
    type: ParseMappingUploadDataDto,
  })
  data!: ParseMappingUploadDataDto;
}
