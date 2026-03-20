import { RowNormalizerService } from './rowNormalizer.service';

describe('RowNormalizerService', () => {
  let service: RowNormalizerService;

  beforeEach(() => {
    service = new RowNormalizerService();
  });

  const columnMapping = { sku: '상품명', quantity: '수량' };

  describe('단일 상품', () => {
    it('일반 텍스트는 그대로 반환', () => {
      const rows = [{ '상품명': '상품A', '수량': 1 }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toEqual(rows);
    });

    it('(상품명 / Nea) 단일 항목 파싱', () => {
      const rows = [{ '상품명': '(스코_윈터_키링_니노 / 1ea)', '수량': 1 }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(1);
      expect(result[0]['상품명']).toBe('스코_윈터_키링_니노');
      expect(result[0]['수량']).toBe(1);
    });
  });

  describe('복합 상품 (\\r\\n 구분)', () => {
    it('\\r\\n으로 구분된 복합 상품 분리', () => {
      const rows = [{
        '상품명': '(스코_윈터_쿠션_오토 / 1ea)\r\n(스코_윈터_쿠션패치_오토 / 1ea)',
        '수량': 1,
        '주문번호': 'ORD-1',
      }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('스코_윈터_쿠션_오토');
      expect(result[0]['수량']).toBe(1);
      expect(result[0]['주문번호']).toBe('ORD-1');
      expect(result[1]['상품명']).toBe('스코_윈터_쿠션패치_오토');
      expect(result[1]['수량']).toBe(1);
    });

    it('\\n으로 구분된 복합 상품 분리', () => {
      const rows = [{
        '상품명': '(나나시_꾹꾹키링 / 1ea)\n(나나시_쿠션 / 2ea)\n(나나시_포카 / 1ea)',
        '수량': 1,
      }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(3);
      expect(result[0]['상품명']).toBe('나나시_꾹꾹키링');
      expect(result[0]['수량']).toBe(1);
      expect(result[1]['상품명']).toBe('나나시_쿠션');
      expect(result[1]['수량']).toBe(2);
      expect(result[2]['상품명']).toBe('나나시_포카');
      expect(result[2]['수량']).toBe(1);
    });
  });

  describe('패턴 매칭 안 되는 항목', () => {
    it('괄호만 있는 항목은 괄호 제거 후 반환', () => {
      const rows = [{ '상품명': '(V_01167)\r\n(V_01171)', '수량': 1 }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('V_01167');
      expect(result[1]['상품명']).toBe('V_01171');
    });
  });

  describe('sku 컬럼 없을 때', () => {
    it('sku 매핑 없으면 원본 반환', () => {
      const rows = [{ '상품명': '상품A', '수량': 1 }];
      const result = service.normalizeRows(rows, { quantity: '수량' });
      expect(result).toEqual(rows);
    });
  });

  describe('주문 수량 × 파싱 수량', () => {
    it('단일 복합 항목: 주문수량 2 × 파싱수량 3 = 6', () => {
      const rows = [{ '상품명': '(상품A / 3ea)', '수량': 2 }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(1);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(6);
    });

    it('복합 상품: 주문수량 3 × 각 파싱수량', () => {
      const rows = [{
        '상품명': '(상품A / 2ea)\n(상품B / 1ea)',
        '수량': 3,
        '주문번호': 'ORD-1',
      }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(6);
      expect(result[1]['상품명']).toBe('상품B');
      expect(result[1]['수량']).toBe(3);
    });
  });

  describe('빈 값 처리', () => {
    it('빈 sku는 원본 유지', () => {
      const rows = [{ '상품명': '', '수량': 1 }];
      const result = service.normalizeRows(rows, columnMapping);
      expect(result).toEqual(rows);
    });
  });
});
