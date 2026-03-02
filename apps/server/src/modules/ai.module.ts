import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../entities/product.entity';
import { AIService } from '../services/ai.service';

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
    AIService,
  ],
  exports: ['LLM_PROVIDER', AIService],
})
export class AIModule {}
