import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundService } from '../services/outbound.service';
import { OutboundController } from '../controllers/outbound.controller';
import { OutboundEntity } from '../entities/outbound.entity';
import { OutboundRepository } from '../repositories/outbound.repository';

@Module({
  imports: [TypeOrmModule.forFeature([OutboundEntity])],
  controllers: [OutboundController],
  providers: [OutboundService, OutboundRepository],
  exports: [OutboundService],
})
export class OutboundModule {}
