import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class ConfirmMappingUploadDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsObject()
  columnMapping!: Record<string, string | null>;

  @IsObject()
  @IsOptional()
  productMapping?: Record<number, string[] | null>;
}
