import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { AIColumnMapperService } from './services/ai-column-mapper.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'LLM_PROVIDER',
      useFactory: (configService: ConfigService) => {
        return new ChatOpenAI({
          modelName: configService.get('AI_MODEL', 'gpt-4.1-nano'),
          temperature: 0,
          apiKey: configService.get('OPENAI_API_KEY'),
        });
      },
      inject: [ConfigService],
    },
    AIColumnMapperService,
  ],
  exports: ['LLM_PROVIDER', AIColumnMapperService],
})
export class AIModule {}
