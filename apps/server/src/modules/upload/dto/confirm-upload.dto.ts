import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsObject()
  mapping!: Record<string, string | null>;
}
