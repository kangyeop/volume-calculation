import { ApiProperty } from '@nestjs/swagger';

export class UpdateMappingResponseDto {
  @ApiProperty({
    description: 'Whether the request was successful',
    example: true,
  })
  success!: boolean;
}
