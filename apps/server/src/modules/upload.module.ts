import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from './ai.module';
import { ProductsModule } from './products.module';
import { ExcelParserService } from '../services/excelParser.service';
import { FileStorageService } from '../services/fileStorage.service';
import { UploadController } from '../controllers/upload.controller';
import { UploadRepository } from '../repositories';
import { UploadParseService } from '../services/uploadParse.service';
import { UploadConfirmService } from '../services/uploadConfirm.service';
import { DataTransformerService } from '../services/dataTransformer.service';

@Module({
  imports: [
    AIModule,
    ProductsModule,
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
  providers: [
    ExcelParserService,
    FileStorageService,
    UploadRepository,
    UploadParseService,
    UploadConfirmService,
    DataTransformerService,
  ],
  exports: [
    ExcelParserService,
    FileStorageService,
    UploadParseService,
    UploadConfirmService,
  ],
})
export class UploadModule {}
