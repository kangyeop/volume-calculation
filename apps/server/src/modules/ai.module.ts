import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../entities/product.entity';
import { AIColumnMapperService } from '../services/ai-column-mapper.service';
import { AIProductMapperService } from '../services/ai-product-mapper.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([ProductEntity])],
  providers: [
    {
      provide: 'LLM_PROVIDER',
      useFactory: (configService: ConfigService) => {
        return configService.get('OPENAI_API_KEY');
      },
      inject: [ConfigService],
    },
    AIColumnMapperService,
    AIProductMapperService,
  ],
  exports: ['LLM_PROVIDER', AIColumnMapperService, AIProductMapperService],
})
export class AIModule {}
