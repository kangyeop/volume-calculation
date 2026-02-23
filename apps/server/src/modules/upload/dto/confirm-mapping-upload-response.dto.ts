import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMappingUploadDataDto {
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
}

export class ConfirmMappingUploadResponseDto {
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
