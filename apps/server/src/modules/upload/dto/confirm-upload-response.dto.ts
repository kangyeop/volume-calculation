import { ApiProperty } from '@nestjs/swagger';
import { ConfirmUploadResponse, ConfirmUploadData } from '@wms/types';

export class ConfirmUploadDataDto implements ConfirmUploadData {
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
    description: 'Batch name for display',
    required: false,
    example: 'Upload 2/25/2026, 10:30:00 AM',
  })
  batchName?: string;
}

export class ConfirmUploadResponseDto implements ConfirmUploadResponse {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Upload confirmation data',
    type: ConfirmUploadDataDto,
  })
  data!: ConfirmUploadDataDto;
}
