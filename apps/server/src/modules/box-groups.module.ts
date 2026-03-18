import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxGroupEntity } from '../entities/box-group.entity';
import { BoxGroupsService } from '../services/box-groups.service';
import { BoxGroupsController } from '../controllers/box-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BoxGroupEntity])],
  providers: [BoxGroupsService],
  controllers: [BoxGroupsController],
  exports: [BoxGroupsService],
})
export class BoxGroupsModule {}
