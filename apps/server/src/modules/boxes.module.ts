import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxesService } from '../services/boxes.service';
import { BoxesController } from '../controllers/boxes.controller';
import { BoxEntity } from '../entities/box.entity';
import { BoxesRepository } from '../repositories/boxes.repository';
import { ExcelService } from '../services/excel.service';
import { PackingResultDetailsRepository } from '../repositories/packing-result-details.repository';
import { PackingResultDetailEntity } from '../entities/packingResultDetail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoxEntity, PackingResultDetailEntity])],
  controllers: [BoxesController],
  providers: [BoxesService, BoxesRepository, ExcelService, PackingResultDetailsRepository],
  exports: [BoxesService],
})
export class BoxesModule {}
