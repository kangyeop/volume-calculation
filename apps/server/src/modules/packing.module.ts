import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingResultEntity } from '../entities/packing-result.entity';
import { PackingResultDetailEntity } from '../entities/packing-result-detail.entity';
import { PackingService } from '../services/packing.service';
import { PackingController } from '../controllers/packing.controller';
import { ExcelService } from '../services/excel.service';
import { ProductsModule } from './products.module';
import { OutboundModule } from './outbound.module';
import { ProjectsModule } from './projects.module';
import { BoxesModule } from './boxes.module';
import { UploadModule } from './upload.module';

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
  providers: [PackingService, ExcelService],
  exports: [PackingService, ExcelService],
})
export class PackingModule {}
