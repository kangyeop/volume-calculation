import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutboundMappingSchema } from '../schemas/outbound-mapping.schema';
import { OutboundMappingResult } from '../schemas/outbound-mapping.schema';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class AIColumnMapperService {
  private readonly logger = new Logger(AIColumnMapperService.name);

  constructor(@Inject('LLM_PROVIDER') private readonly apiKey: string) {}

  async mapOutboundColumns(headers: string[], sampleRows: any[]): Promise<OutboundMappingResult> {
    try {
      this.logger.log(`Mapping outbound columns for ${headers.length} headers`);

      const llm = new ChatOpenAI({
        modelName: 'gpt-4.1-nano',
        temperature: 0,
        apiKey: this.apiKey,
      });

      const structuredLlm = llm.withStructuredOutput(OutboundMappingSchema);

      const prompt = this.buildOutboundPrompt(headers, sampleRows);

      const result = await structuredLlm.invoke([
        [
          'system',
          'You are a helpful data mapping assistant. Analyze CSV headers and sample data to map columns to required fields.',
        ],
        ['human', prompt],
      ]);

      this.logger.log(`Successfully mapped outbound columns`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to map outbound columns using AI: ${err.message}`, err.stack);
      throw error;
    }
  }

  private buildOutboundPrompt(headers: string[], sampleRows: any[]): string {
    const fullData = sampleRows.map((row) =>
      Object.fromEntries(headers.map((h) => [h, row[h] ?? ''])),
    );

    return `Analyze the following Excel data and map columns to outbound order fields.

Headers: ${headers.join(', ')}

Complete Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

Required fields to map:
- orderId: for tracking the order
  Pattern: Long numeric string

- sku: sku name
  Pattern: (상품명 / 개수ea)

- quantity: order quantity
  Pattern: Number

- recipientName
  Pattern: Person's name

- address
  Pattern: Main address

Mapping Rules:
1. Prefer columns with exact Korean field names
2. Look for common patterns in the actual data values
3. Ignore system/internal fields
5. Ignore complex/formatted columns`;
  }
}
