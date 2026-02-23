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
    const fullData = sampleRows.map(row =>
      Object.fromEntries(
        headers.map(h => [h, row[h] ?? ''])
      )
    );

    return `Analyze the following Excel data and map columns to outbound order fields.

Headers: ${headers.join(', ')}

Complete Data (JSON format, ${sampleRows.length} rows):
${JSON.stringify(fullData, null, 2)}

Required fields to map:
- orderId: 쇼핑몰 주문번호, 주문번호, 오더번호, 주문ID
  Pattern: Long numeric string

- sku: 연동코드, 상품코드, SKU, 상품번호
  Pattern: Product identifier, may contain parentheses

- quantity: 주문수량, 수량, 개수, quantity
  Pattern: Number

- recipientName: 수취인, 받는분, 고객명, 이름
  Pattern: Person's name

- recipientPhone: 수취인연락처, 휴대폰, 연락처, 전화번호
  Pattern: Phone number

- zipCode: 우편번호, 우편, zip
  Pattern: 5-digit code

- address: 주소, 배송지, 주소1
  Pattern: Main address

- detailAddress: 상세주소, 배송상세주소, 주소2
  Pattern: Additional address info

- shippingMemo: 비고, 메모, 배송메모, 요청사항
  Pattern: Free text, may be empty

- orderProductName: 주문서 상품명
  Pattern: Product name from order sheet

- optionName: 옵션명
  Pattern: Option name with variant details

Mapping Rules:
1. Prefer columns with exact Korean field names (수취인, 주문수량, etc.)
2. Look for common patterns in the actual data values
3. Ignore system/internal fields (출고주문상태, 매핑여부, 수집일, 수집차단여부)
4. Ignore aggregate fields (총 주문수량, 총 금액) - use per-item fields instead
5. Ignore complex/formatted columns (상품명 / 매핑수량)

Return mapping with confidence scores (0-1). Set to null if no matching column found.`;
  }

  private buildProductPrompt(headers: string[], sampleRows: any[]): string {
    const fullData = sampleRows.map(row =>
      Object.fromEntries(
        headers.map(h => [h, row[h] ?? ''])
      )
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
3. Parse values: 2 values = (width, length, height=0), 3 values = (width, length, height)

Return mapping with confidence scores (0-1). Set to null if no matching column found.`;
  }
}
