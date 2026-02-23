import { Inject, Injectable, Logger } from '@nestjs/common';
import { OutboundMappingSchema } from '../schemas/outbound-mapping.schema';
import { ProductMappingSchema } from '../schemas/product-mapping.schema';
import { OutboundMappingResult } from '../schemas/outbound-mapping.schema';
import { ProductMappingResult } from '../schemas/product-mapping.schema';
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

      const result = (await structuredLlm.invoke([
        [
          'system',
          'You are a helpful data mapping assistant. Analyze CSV headers and sample data to map columns to required fields.',
        ],
        ['human', prompt],
      ])) as OutboundMappingResult;

      this.logger.log(`Successfully mapped outbound columns with confidence ${result.confidence}`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to map outbound columns using AI: ${err.message}`, err.stack);
      throw error;
    }
  }

  async mapProductColumns(headers: string[], sampleRows: any[]): Promise<ProductMappingResult> {
    try {
      this.logger.log(`Mapping product columns for ${headers.length} headers`);

      const llm = new ChatOpenAI({
        modelName: 'gpt-4.1-nano',
        temperature: 0,
        apiKey: this.apiKey,
      });

      const structuredLlm = llm.withStructuredOutput(ProductMappingSchema);

      const prompt = this.buildProductPrompt(headers, sampleRows);

      const result = (await structuredLlm.invoke([
        [
          'system',
          'You are a helpful data mapping assistant. Analyze CSV headers and sample data to map columns to required fields.',
        ],
        ['human', prompt],
      ])) as ProductMappingResult;

      this.logger.log(`Successfully mapped product columns with confidence ${result.confidence}`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to map product columns using AI: ${err.message}`, err.stack);
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
  Pattern: Product identifier, may contain parentheses

- quantity: order quantity
  Pattern: Number

- recipientName
  Pattern: Person's name

- recipientPhone
  Pattern: Phone number

- address
  Pattern: Main address

Mapping Rules:
1. Prefer columns with exact Korean field names
2. Look for common patterns in the actual data values
3. Ignore system/internal fields 
4. Ignore aggregate fields (총 주문수량, 총 금액) - use per-item fields instead
5. Ignore complex/formatted columns`;
  }

  private buildProductPrompt(headers: string[], sampleRows: any[]): string {
    const fullData = sampleRows.map((row) =>
      Object.fromEntries(headers.map((h) => [h, row[h] ?? ''])),
    );

    return `Analyze the following Excel data and map columns to product fields.

Headers: ${headers.join(', ')}

Complete Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

Required fields to map:
- sku: 상품코드, SKU, 제품코드, 연동코드
  Pattern: Product identifier

- name: 상품명, 제품명, 상품이름
  Pattern: Product name or description

- dimensions: 규격, 사이즈, dimension, 치수
  Korean column names: 규격, 사이즈, dimension, 치수
  Example formats: "30*40*20", "10x20x30cm", "6*8cm", "10x20mm", "100X200X50", "30 40 20"

For dimensions, identify: SEPARATOR used between values:
- Common separators: *, x, X, space, comma
- Example: "30*40*20" -> separator is "*"
- Example: "10x20x30" -> separator is "x"
- Example: "30 40 20" -> separator is " " (space)
- Example: "30,40,20" -> separator is ","

The parsing code will:
1. Remove unit suffix (cm, mm, m, in, inch) if present
2. Split by the identified separator
3. Parse values: 2 values = (width, length, height=0), 3 values = (width, length, height)`;
  }
}
