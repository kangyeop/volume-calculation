import { Inject, Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { OutboundMappingSchema } from '../schemas/outbound-mapping.schema';
import { ProductMappingSchema } from '../schemas/product-mapping.schema';
import { OutboundMappingResult } from '../schemas/outbound-mapping.schema';
import { ProductMappingResult } from '../schemas/product-mapping.schema';

@Injectable()
export class AIColumnMapperService {
  private readonly logger = new Logger(AIColumnMapperService.name);

  constructor(@Inject('LLM_PROVIDER') private readonly llm: BaseChatModel) {}

  async mapOutboundColumns(headers: string[], sampleRows: any[]): Promise<OutboundMappingResult> {
    try {
      this.logger.log(`Mapping outbound columns for ${headers.length} headers`);

      const structuredLlm = this.llm.withStructuredOutput(OutboundMappingSchema);

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

      const structuredLlm = this.llm.withStructuredOutput(ProductMappingSchema);

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
    const headersList = headers.map((h, i) => `${i + 1}. ${h}`).join('\n');
    const sampleData = sampleRows
      .slice(0, 3)
      .map((row) => headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | '))
      .join('\n');

    return `Please analyze the following CSV headers and sample data to map columns to outbound order fields.

Headers:
${headersList}

Sample Data (${sampleRows.length} rows, showing first 3):
${sampleData}

Required fields to map:
- orderId: Order ID or order number
- sku: Product SKU or product code
- quantity: Order quantity or amount
- recipientName: Recipient name or customer name
- recipientPhone: Recipient phone number or contact number
- zipCode: Postal code or zip code
- address: Main address
- detailAddress: Detailed address or additional address info
- shippingMemo: Shipping notes or delivery instructions

Return a mapping with confidence scores (0-1) for each field. Set to null if no matching column is found.`;
  }

  private buildProductPrompt(headers: string[], sampleRows: any[]): string {
    const headersList = headers.map((h, i) => `${i + 1}. ${h}`).join('\n');
    const sampleData = sampleRows
      .slice(0, 3)
      .map((row) => headers.map((h) => `${h}: ${row[h] ?? ''}`).join(' | '))
      .join('\n');

    return `Please analyze the following CSV headers and sample data to map columns to product fields.

Headers:
${headersList}

Sample Data (${sampleRows.length} rows, showing first 3):
${sampleData}

Required fields to map:
- sku: Product SKU or product code
- name: Product name or description
- width: Product width
- length: Product length
- height: Product height
- weight: Product weight
- inboundDate: Inbound date or received date
- outboundDate: Outbound date or shipped date
- barcode: Product barcode or EAN/UPC
- aircap: Air cap quantity or packaging bubble wrap
- remarks: Product remarks or notes

Return a mapping with confidence scores (0-1) for each field. Set to null if no matching column is found.`;
  }
}
