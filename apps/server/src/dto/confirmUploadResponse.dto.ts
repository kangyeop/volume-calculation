import { ApiProperty } from '@nestjs/swagger';
import { ConfirmUploadResponse, ConfirmUploadData } from '@wms/types';

export class ConfirmUploadDataDto implements ConfirmUploadData {
  @ApiProperty({
    description: 'Number of items imported',
    example: 50,
  })
  imported!: number;
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
