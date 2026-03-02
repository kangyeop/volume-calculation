---
name: ai
description: Specialized agent for AI/ML integration using LangChain and OpenAI. Handles AI services, structured outputs with Zod schemas, and fallback strategies.
---

# AI Agent Rules

## Stack

- LangChain (`@langchain/core`, `@langchain/openai`)
- Zod for schema validation
- OpenAI GPT-4o
- NestJS modules with dependency injection

## Directory Structure

- `src/modules/ai/`: AI module root
  - `ai.module.ts`: Module definition with LLM provider configuration
  - `ai.service.ts`: Core AI service with provider management
  - `ai.controller.ts`: AI-related endpoints (optional)
  - `schemas/`: Zod schemas for structured outputs
    - `outbound-mapping.schema.ts`: Outbound column mapping schema
    - `product-mapping.schema.ts`: Product column mapping schema
  - `services/`: AI-specific services
    - `ai-column-mapper.service.ts`: Column mapping with withStructuredOutput
    - `fallback-mapper.service.ts`: Fallback keyword-based mapping
  - `exceptions/`: Custom exceptions
    - `ai.exception.ts`: AI service errors

## LLM Configuration

### Environment Variables

```
OPENAI_API_KEY=your_openai_key
AI_MODEL=gpt-4o
AI_TEMPERATURE=0
AI_MAX_TOKENS=2000
AI_TIMEOUT=30000
AI_MAX_RETRIES=2
```

### Provider Setup

Use factory providers in `ai.module.ts` to configure LLM instance:

```typescript
{
  provide: 'LLM_PROVIDER',
  useFactory: (configService: ConfigService) => {
    return new ChatOpenAI({
      modelName: configService.get('AI_MODEL', 'gpt-4o'),
      temperature: configService.get('AI_TEMPERATURE', 0),
      maxTokens: configService.get('AI_MAX_TOKENS', 2000),
      timeout: configService.get('AI_TIMEOUT', 30000),
      maxRetries: configService.get('AI_MAX_RETRIES', 2),
      apiKey: configService.get('OPENAI_API_KEY'),
    });
  },
  inject: [ConfigService],
}
```

## withStructuredOutput Pattern

### Zod Schema Definition

Define schemas in `schemas/` directory:

```typescript
import { z } from 'zod';

export const OutboundMappingSchema = z.object({
  confidence: z.number().min(0).max(1).describe('Overall mapping confidence (0~1)'),
  mapping: z.object({
    orderId: z
      .object({
        columnName: z.string(),
        confidence: z.number().min(0).max(1),
      })
      .nullable(),
    // ... other fields
  }),
  unmappedColumns: z.array(z.string()),
  notes: z.string().optional(),
});

export type OutboundMappingResult = z.infer<typeof OutboundMappingSchema>;
```

### Usage in Service

```typescript
const structuredLlm = this.llm.withStructuredOutput(OutboundMappingSchema);
const result = await structuredLlm.invoke([
  ['system', 'You are a helpful data mapping assistant.'],
  ['human', prompt],
]);
```

## Fallback Strategy

When AI fails, use keyword-based mapping:

1. Predefined keyword maps for each field
2. String similarity matching (case-insensitive, normalize spaces/underscores)
3. Return structured result same as AI format
4. Include note that fallback was used

## Error Handling

- Rate limiting (429): Log and return error to user
- Invalid API key (401): Log and return error
- Timeout (504): Retry with maxRetries, then use fallback mapper
- Parse errors: Use fallback mapper

## Cost Considerations

- `temperature: 0` for deterministic results
- Limit `maxTokens` to minimum needed
- Consider using cheaper models (GPT-4o-mini, Claude Haiku) for simple tasks
- Track usage if needed for cost monitoring

## Naming Conventions

- **Files**: Kebab-case (e.g., `ai-column-mapper.service.ts`)
- **Classes**: PascalCase (e.g., `AIColumnMapperService`, `OutboundMappingSchema`)
- **Schemas**: PascalCase with `Schema` suffix (e.g., `OutboundMappingSchema`)
- **Types**: PascalCase with `Result` suffix (e.g., `OutboundMappingResult`)

## Dependencies

- `@langchain/core`: Core LangChain types
- `@langchain/openai`: OpenAI integration
- `zod`: Schema validation
