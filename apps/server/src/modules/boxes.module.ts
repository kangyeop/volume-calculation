import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxesService } from '../services/boxes.service';
import { BoxesController } from '../controllers/boxes.controller';
import { BoxEntity } from '../entities/box.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoxEntity])],
  controllers: [BoxesController],
  providers: [BoxesService],
  exports: [BoxesService],
})
export class BoxesModule {}
