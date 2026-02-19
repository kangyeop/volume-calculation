import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { AIModule } from '../ai/ai.module';
import { ExcelParserService } from './services/excel-parser.service';
import { UploadSessionService } from './services/upload-session.service';
import { FileStorageService } from './services/file-storage.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    AIModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          const uploadsDir = join(process.cwd(), 'uploads', 'temp');
          if (fs.existsSync(uploadsDir)) {
            callback(null, uploadsDir);
          } else {
            fs.mkdirSync(uploadsDir, { recursive: true });
            callback(null, uploadsDir);
          }
        },
        filename: (_req, _file, callback) => {
          const ext = _file.originalname.split('.').pop();
          callback(null, `${randomUUID()}.${ext || 'xlsx'}`);
        },
      }),
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
  providers: [ExcelParserService, UploadSessionService, FileStorageService],
  exports: [ExcelParserService, UploadSessionService, FileStorageService],
})
export class UploadModule {}
