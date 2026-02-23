import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { UploadType } from '@wms/types';

export class ParseMappingUploadDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['outbound', 'product'], {
    message: 'Type must be either outbound or product',
  })
  type!: UploadType;

  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsOptional()
  includeProductMapping?: string;
}
