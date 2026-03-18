import { RowNormalizerService } from './rowNormalizer.service';
import { CompoundDetectionResult } from './schemas/compound-detection.schema';

describe('RowNormalizerService', () => {
  let service: RowNormalizerService;

  beforeEach(() => {
    service = new RowNormalizerService();
  });

  const columnMapping = { sku: '상품명', quantity: '수량' };

  describe('detection이 없거나 false일 때', () => {
    it('null이면 원본 반환', () => {
      const rows = [{ '상품명': '상품A', '수량': 1 }];
      expect(service.normalizeRows(rows, columnMapping, null)).toEqual(rows);
    });

    it('detected=false이면 원본 반환', () => {
      const rows = [{ '상품명': '상품A', '수량': 1 }];
      const detection: CompoundDetectionResult = {
        detected: false,
        delimiter: null,
        itemPattern: null,
        parsedSamples: null,
      };
      expect(service.normalizeRows(rows, columnMapping, detection)).toEqual(rows);
    });
  });

  describe('줄바꿈 delimiter + 정규식 파싱', () => {
    it('정규식으로 상품명과 수량 추출', () => {
      const rows = [
        { '상품명': '상품A[2]\n상품B[3]', '수량': 1, '주문번호': 'ORD-1' },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '(.+?)\\[([0-9]+)\\]',
        parsedSamples: [
          { raw: '상품A[2]', productName: '상품A', quantity: 2 },
          { raw: '상품B[3]', productName: '상품B', quantity: 3 },
        ],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ '상품명': '상품A', '수량': 2, '주문번호': 'ORD-1' });
      expect(result[1]).toEqual({ '상품명': '상품B', '수량': 3, '주문번호': 'ORD-1' });
    });
  });

  describe('괄호+슬래시+ea 패턴', () => {
    it('(상품명 / 수량ea) 형태 파싱', () => {
      const rows = [
        {
          '상품명': '(나나시_꾹꾹키링 / 1ea)\n(나나시_쿠션 / 2ea)\n(나나시_포카 / 1ea)',
          '수량': 1,
        },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '\\((.+?)\\s*/\\s*([0-9]+)ea\\)',
        parsedSamples: [
          { raw: '(나나시_꾹꾹키링 / 1ea)', productName: '나나시_꾹꾹키링', quantity: 1 },
          { raw: '(나나시_쿠션 / 2ea)', productName: '나나시_쿠션', quantity: 2 },
          { raw: '(나나시_포카 / 1ea)', productName: '나나시_포카', quantity: 1 },
        ],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(3);
      expect(result[0]['상품명']).toBe('나나시_꾹꾹키링');
      expect(result[0]['수량']).toBe(1);
      expect(result[1]['상품명']).toBe('나나시_쿠션');
      expect(result[1]['수량']).toBe(2);
      expect(result[2]['상품명']).toBe('나나시_포카');
      expect(result[2]['수량']).toBe(1);
    });
  });

  describe('정규식 실패 시 parsedSamples 폴백', () => {
    it('잘못된 정규식이면 parsedSamples 룩업 사용', () => {
      const rows = [
        { '상품명': '(상품A / 1ea)\n(상품B / 2ea)', '수량': 1 },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '[invalid regex(',
        parsedSamples: [
          { raw: '(상품A / 1ea)', productName: '상품A', quantity: 1 },
          { raw: '(상품B / 2ea)', productName: '상품B', quantity: 2 },
        ],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(1);
      expect(result[1]['상품명']).toBe('상품B');
      expect(result[1]['수량']).toBe(2);
    });

    it('정규식 매칭 안 되면 parsedSamples에서 찾기', () => {
      const rows = [
        { '상품명': '【상품A·1개】\n【상품B·3개】', '수량': 1 },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '(.+?)\\[([0-9]+)\\]',
        parsedSamples: [
          { raw: '【상품A·1개】', productName: '상품A', quantity: 1 },
          { raw: '【상품B·3개】', productName: '상품B', quantity: 3 },
        ],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(1);
      expect(result[1]['상품명']).toBe('상품B');
      expect(result[1]['수량']).toBe(3);
    });
  });

  describe('단일 상품 행은 그대로 유지', () => {
    it('delimiter로 분리해도 1개면 원본 유지', () => {
      const rows = [
        { '상품명': '단일상품', '수량': 1 },
        { '상품명': '상품A[2]\n상품B[1]', '수량': 1 },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '(.+?)\\[([0-9]+)\\]',
        parsedSamples: [],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(3);
      expect(result[0]['상품명']).toBe('단일상품');
      expect(result[1]['상품명']).toBe('상품A');
      expect(result[2]['상품명']).toBe('상품B');
    });
  });

  describe('쉼표 delimiter', () => {
    it('쉼표로 구분된 복합 상품 처리', () => {
      const rows = [
        { '상품명': '상품A x2, 상품B x1', '수량': 1 },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: ',',
        itemPattern: '(.+?)\\s*[xX]\\s*([0-9]+)',
        parsedSamples: [
          { raw: '상품A x2', productName: '상품A', quantity: 2 },
          { raw: '상품B x1', productName: '상품B', quantity: 1 },
        ],
      };

      const result = service.normalizeRows(rows, columnMapping, detection);

      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(2);
      expect(result[1]['상품명']).toBe('상품B');
      expect(result[1]['수량']).toBe(1);
    });
  });

  describe('수량 컬럼 없을 때', () => {
    it('수량 매핑 없으면 상품명만 분리', () => {
      const mapping = { sku: '상품명' };
      const rows = [
        { '상품명': '상품A\n상품B', '수량': 1 },
      ];
      const detection: CompoundDetectionResult = {
        detected: true,
        delimiter: '\n',
        itemPattern: '(.+)',
        parsedSamples: [
          { raw: '상품A', productName: '상품A', quantity: 1 },
          { raw: '상품B', productName: '상품B', quantity: 1 },
        ],
      };

      const result = service.normalizeRows(rows, mapping, detection);

      expect(result).toHaveLength(2);
      expect(result[0]['상품명']).toBe('상품A');
      expect(result[0]['수량']).toBe(1);
      expect(result[1]['상품명']).toBe('상품B');
      expect(result[1]['수량']).toBe(1);
    });
  });
});
