import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingResultEntity } from '../entities/packingResult.entity';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';
import { PackingService } from '../services/packing.service';
import { PackingController } from '../controllers/packing.controller';
import { ExcelService } from '../services/excel.service';
import { ProductsModule } from './products.module';
import { OutboundModule } from './outbound.module';
import { ProjectsModule } from './projects.module';
import { BoxesModule } from './boxes.module';
import { UploadModule } from './upload.module';
import { PackingResultsRepository } from '../repositories/packing-results.repository';
import { PackingResultDetailsRepository } from '../repositories/packing-result-details.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackingResultEntity, PackingResultDetailEntity]),
    ProductsModule,
    OutboundModule,
    ProjectsModule,
    BoxesModule,
    forwardRef(() => UploadModule),
  ],
  controllers: [PackingController],
  providers: [
    PackingService,
    ExcelService,
    PackingResultsRepository,
    PackingResultDetailsRepository,
  ],
  exports: [PackingService, ExcelService],
})
export class PackingModule {}
