import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadDataDto {
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
}

export class ConfirmUploadResponseDto {
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
