import { IsString, IsNotEmpty } from 'class-validator';

export class ParseUploadDto {
  @IsString()
  @IsNotEmpty()
  type!: 'outbound' | 'product';

  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
