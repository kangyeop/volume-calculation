import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductGroupEntity } from '../entities/product-group.entity';
import { ProductGroupsService } from '../services/product-groups.service';
import { ProductGroupsController } from '../controllers/product-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductGroupEntity])],
  providers: [ProductGroupsService],
  controllers: [ProductGroupsController],
  exports: [ProductGroupsService],
})
export class ProductGroupsModule {}
