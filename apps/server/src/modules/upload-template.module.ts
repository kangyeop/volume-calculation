import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadTemplateEntity } from '../entities/upload-template.entity';
import { UploadTemplateController } from '../controllers/upload-template.controller';
import { UploadTemplateRepository } from '../repositories/upload-template.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UploadTemplateEntity])],
  controllers: [UploadTemplateController],
  providers: [UploadTemplateRepository],
  exports: [UploadTemplateRepository],
})
export class UploadTemplateModule {}
