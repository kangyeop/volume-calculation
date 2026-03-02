import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from '../ai/ai.module';
import { OutboundModule } from '../outbound/outbound.module';
import { ProductsModule } from '../products/products.module';
import { ExcelParserService } from './services/excel-parser.service';
import { UploadSessionService } from './services/upload-session.service';
import { FileStorageService } from './services/file-storage.service';
import { UploadController } from './upload.controller';
import { UploadRepository } from './repositories/upload.repository';
import { UploadParseService } from './services/upload-parse.service';
import { UploadConfirmService } from './services/upload-confirm.service';
import { UploadMappingService } from './services/upload-mapping.service';
import { DataTransformerService } from './services/data-transformer.service';

@Module({
  imports: [
    AIModule,
    forwardRef(() => OutboundModule),
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
    UploadSessionService,
    FileStorageService,
    UploadRepository,
    UploadParseService,
    UploadConfirmService,
    UploadMappingService,
    DataTransformerService,
  ],
  exports: [
    ExcelParserService,
    UploadSessionService,
    FileStorageService,
    UploadParseService,
    UploadConfirmService,
    UploadMappingService,
  ],
})
export class UploadModule {}
