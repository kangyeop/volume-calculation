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
          temperature: configService.get('AI_TEMPERATURE', 0),
          maxTokens: configService.get('AI_MAX_TOKENS', 2000),
          timeout: configService.get('AI_TIMEOUT', 30000),
          maxRetries: configService.get('AI_MAX_RETRIES', 2),
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
