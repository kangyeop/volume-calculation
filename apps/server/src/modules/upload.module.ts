import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from './ai.module';
import { ProductsModule } from './products.module';
import { PackingModule } from './packing.module';
import { FileStorageService } from '../services/fileStorage.service';
import { UploadController } from '../controllers/upload.controller';
import { UploadRepository } from '../repositories';
import { UploadParseService } from '../services/uploadParse.service';
import { UploadConfirmService } from '../services/uploadConfirm.service';
import { DataTransformerService } from '../services/dataTransformer.service';
import { OutboundEntity } from '../entities/outbound.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrderEntity } from '../entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboundEntity, ProductEntity, OrderEntity]),
    AIModule,
    ProductsModule,
    forwardRef(() => PackingModule),
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
    FileStorageService,
    UploadRepository,
    UploadParseService,
    UploadConfirmService,
    DataTransformerService,
  ],
  exports: [
    FileStorageService,
    UploadParseService,
    UploadConfirmService,
  ],
})
export class UploadModule {}
