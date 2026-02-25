import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductMappingDto {
  @ApiProperty({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({
    description: 'Column mapping',
    type: 'object',
    properties: {
      orderId: { type: 'string', example: '주문번호' },
      sku: { type: 'string', example: 'SKU' },
      quantity: { type: 'string', example: '수량' },
    },
  })
  @IsObject()
  columnMapping!: Record<string, string | null>;
}
