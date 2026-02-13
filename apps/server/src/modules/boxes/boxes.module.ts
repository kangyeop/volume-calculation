import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxesService } from './boxes.service';
import { BoxesController } from './boxes.controller';
import { BoxEntity } from './entities/box.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoxEntity])],
  controllers: [BoxesController],
  providers: [BoxesService],
  exports: [BoxesService],
})
export class BoxesModule {}
