import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from '../ai/ai.module';
import { ExcelParserService } from './services/excel-parser.service';
import { UploadSessionService } from './services/upload-session.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    AIModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter(_req, file, callback) {
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const ext = file.originalname.toLowerCase();
        const isValid = allowedExtensions.some((e) => ext.endsWith(e));
        callback(null, isValid);
      },
    }),
  ],
  controllers: [UploadController],
  providers: [ExcelParserService, UploadSessionService],
  exports: [ExcelParserService, UploadSessionService],
})
export class UploadModule {}
