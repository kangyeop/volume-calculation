import { Injectable, Logger } from '@nestjs/common';
import { OutboundMappingResult } from '../schemas/outbound-mapping.schema';
import { ProductMappingResult } from '../schemas/product-mapping.schema';

interface KeywordMap {
  [key: string]: string[];
}

@Injectable()
export class FallbackMapperService {
  private readonly logger = new Logger(FallbackMapperService.name);

  private readonly outboundKeywords: KeywordMap = {
    orderId: ['order', 'id', 'orderid', 'order_id', 'no', 'number', '주문'],
    sku: ['sku', 'code', 'product', 'item', '상품', '코드'],
    quantity: ['qty', 'quantity', 'amount', 'count', '수량'],
    recipientName: ['recipient', 'name', 'customer', 'receiver', '수신', '이름', '고객'],
    recipientPhone: ['phone', 'tel', 'mobile', 'contact', '전화', '번호', '연락처'],
    zipCode: ['zip', 'postal', 'code', 'zipcode', '우편', '우편번호'],
    address: ['address', 'addr', '주소', '배송'],
    detailAddress: ['detail', 'addr', 'address2', 'addr2', 'sub', '상세', '나머지주소'],
    shippingMemo: ['memo', 'note', 'comment', 'remark', 'shipping', 'delivery', '메모', '요청사항'],
  };

  private readonly productKeywords: KeywordMap = {
    sku: ['sku', 'code', 'product', 'item', '상품', '코드'],
    name: ['name', 'title', 'description', 'desc', '상품명', '이름'],
    width: ['width', 'w', '너비', '폭', '가로'],
    length: ['length', 'l', 'len', '길이', '세로'],
    height: ['height', 'h', '높이', '깊이'],
    weight: ['weight', 'wt', 'kg', '무게'],
    inboundDate: ['inbound', 'in', 'received', 'arrival', '입고', '입고일'],
    outboundDate: ['outbound', 'out', 'shipped', 'delivery', '출고', '출고일'],
    barcode: ['barcode', 'ean', 'upc', 'isbn', '바코드'],
    aircap: ['aircap', 'bubble', 'wrap', '에어캡', '뽁뽁이'],
    remarks: ['remark', 'note', 'memo', 'comment', '비고', '메모', '참고'],
  };

  mapOutboundColumns(headers: string[], _sampleRows: any[]): OutboundMappingResult {
    this.logger.log('Using fallback mapper for outbound columns');

    const mapping: any = {};
    const mappedColumns = new Set<string>();

    for (const [field, keywords] of Object.entries(this.outboundKeywords)) {
      const match = this.findBestMatch(headers, keywords, mappedColumns);
      if (match) {
        mapping[field] = {
          columnName: match.columnName,
          confidence: match.confidence,
        };
        mappedColumns.add(match.columnName);
      } else {
        mapping[field] = null;
      }
    }

    const unmappedColumns = headers.filter((h) => !mappedColumns.has(h));

    return {
      confidence: 0.5,
      mapping,
      unmappedColumns,
      notes: 'Mapped using fallback keyword matching. AI-based mapping was unavailable.',
    };
  }

  mapProductColumns(headers: string[], _sampleRows: any[]): ProductMappingResult {
    this.logger.log('Using fallback mapper for product columns');

    const mapping: any = {};
    const mappedColumns = new Set<string>();

    for (const [field, keywords] of Object.entries(this.productKeywords)) {
      const match = this.findBestMatch(headers, keywords, mappedColumns);
      if (match) {
        mapping[field] = {
          columnName: match.columnName,
          confidence: match.confidence,
        };
        mappedColumns.add(match.columnName);
      } else {
        mapping[field] = null;
      }
    }

    const unmappedColumns = headers.filter((h) => !mappedColumns.has(h));

    return {
      confidence: 0.5,
      mapping,
      unmappedColumns,
      notes: 'Mapped using fallback keyword matching. AI-based mapping was unavailable.',
    };
  }

  private findBestMatch(
    headers: string[],
    keywords: string[],
    mappedColumns: Set<string>,
  ): { columnName: string; confidence: number } | null {
    let bestMatch: { columnName: string; confidence: number } | null = null;

    for (const header of headers) {
      if (mappedColumns.has(header)) continue;

      const normalizedHeader = this.normalizeString(header);
      const matchScore = this.calculateMatchScore(normalizedHeader, keywords);

      if (matchScore > 0) {
        if (!bestMatch || matchScore > bestMatch.confidence) {
          bestMatch = {
            columnName: header,
            confidence: matchScore,
          };
        }
      }
    }

    return bestMatch;
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[_\s-]/g, '')
      .trim();
  }

  private calculateMatchScore(normalizedHeader: string, keywords: string[]): number {
    for (const keyword of keywords) {
      const normalizedKeyword = this.normalizeString(keyword);
      if (normalizedKeyword === normalizedHeader) {
        return 0.85;
      }
      if (normalizedHeader.includes(normalizedKeyword)) {
        return 0.7;
      }
      if (normalizedKeyword.includes(normalizedHeader)) {
        return 0.6;
      }
    }
    return 0;
  }
}
