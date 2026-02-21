import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ParseUploadDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['outbound', 'product'], {
    message: 'Type must be either outbound or product',
  })
  type!: 'outbound' | 'product';

  @IsString()
  @IsNotEmpty()
  projectId!: string;
}
