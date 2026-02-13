import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingResultEntity } from './entities/packing-result.entity';
import { PackingService } from './packing.service';
import { PackingController } from './packing.controller';
import { ProductsModule } from '../products/products.module';
import { OutboundModule } from '../outbound/outbound.module';
import { ProjectsModule } from '../projects/projects.module';
import { BoxesModule } from '../boxes/boxes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PackingResultEntity]),
    ProductsModule,
    OutboundModule,
    ProjectsModule,
    BoxesModule,
  ],
  controllers: [PackingController],
  providers: [PackingService],
  exports: [PackingService],
})
export class PackingModule {}
