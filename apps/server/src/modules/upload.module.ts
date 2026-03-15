import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from './ai.module';
import { ProductsModule } from './products.module';
import { PackingModule } from './packing.module';
import { OutboundBatchModule } from './outbound-batch.module';
import { FileStorageService } from '../services/fileStorage.service';
import { UploadController } from '../controllers/upload.controller';
import { UploadRepository } from '../repositories';
import { OutboundRepository } from '../repositories/outbound.repository';
import { UploadService } from '../services/upload.service';
import { DataTransformerService } from '../services/dataTransformer.service';
import { OutboundItemEntity } from '../entities/outbound-item.entity';
import { ProductEntity } from '../entities/product.entity';
import { OrderEntity } from '../entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboundItemEntity, ProductEntity, OrderEntity]),
    AIModule,
    ProductsModule,
    OutboundBatchModule,
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
    OutboundRepository,
    UploadService,
    DataTransformerService,
  ],
  exports: [FileStorageService, UploadService],
})
export class UploadModule {}
