import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundService } from './outbound.service';
import { OutboundController } from './outbound.controller';
import { OutboundEntity } from './entities/outbound.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundEntity])],
  controllers: [OutboundController],
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
