import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingResultEntity } from './entities/packing-result.entity';
import { PackingResultDetailEntity } from './entities/packing-result-detail.entity';
import { PackingService } from './packing.service';
import { PackingController } from './packing.controller';
import { ExcelExportService } from './services/excel-export.service';
import { ProductsModule } from '../products/products.module';
import { OutboundModule } from '../outbound/outbound.module';
import { ProjectsModule } from '../projects/projects.module';
import { BoxesModule } from '../boxes/boxes.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackingResultEntity, PackingResultDetailEntity]),
    ProductsModule,
    OutboundModule,
    ProjectsModule,
    BoxesModule,
    UploadModule,
  ],
  controllers: [PackingController],
  providers: [PackingService, ExcelExportService],
  exports: [PackingService, ExcelExportService],
})
export class PackingModule {}
