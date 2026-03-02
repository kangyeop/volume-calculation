import { ApiProperty } from '@nestjs/swagger';
import { ColumnMapping, MappingResult, ParseUploadResponse, ParseUploadData } from '@wms/types';

export class ColumnMappingDto implements ColumnMapping {
  @ApiProperty({
    description: 'Column name from the Excel file',
    example: '주문번호',
  })
  columnName!: string;
}

export class MappingResultDto implements MappingResult {
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

export class ParseUploadDataDto implements ParseUploadData {
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
    description: 'Parsed row data from the Excel file',
    type: [Object],
  })
  rows!: Record<string, unknown>[];

  @ApiProperty({
    description: 'AI-suggested column mapping',
    type: MappingResultDto,
  })
  mapping!: MappingResultDto;

  @ApiProperty({
    description: 'Original filename',
    example: 'orders.xlsx',
  })
  fileName!: string;
}

export class ParseUploadResponseDto implements ParseUploadResponse {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Parsed upload data',
    type: ParseUploadDataDto,
  })
  data!: ParseUploadDataDto;
}
