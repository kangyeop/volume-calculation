import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AIModule } from './ai.module';
import { ProductsModule } from './products.module';
import { PackingModule } from './packing.module';
import { ProductUploadController } from '../controllers/productUpload.controller';
import { ProductUploadService } from '../services/productUpload.service';

@Module({
  imports: [
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
  controllers: [ProductUploadController],
  providers: [ProductUploadService],
  exports: [ProductUploadService],
})
export class ProductUploadModule {}
