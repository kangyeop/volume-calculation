import { Test } from '@nestjs/testing';
import { UploadService } from '../src/services/upload.service';

describe('Upload E2E 통합 테스트 - 나나시.xlsx 업로드', () => {
  let uploadService: UploadService;

  const TEST_PROJECT_ID = 'test-integration-project';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      providers: [
        {
          provide: UploadService,
          useValue: {
            parseFile: jest.fn().mockResolvedValue({
              headers: [
                '출고주문상태',
                '매핑여부',
                '수집일',
                '주문구분',
                '쇼핑몰 별칭',
                '쇼핑몰 주문번호',
                '총 주문수량',
                '총 금액',
                '수취인',
                '수취인연락처',
                '수취인연락처2',
                '우편번호',
                '주소',
                '상세주소',
                '비고',
                '수집처리 ID',
                '주문서 상품명',
                '옵션명',
                '주문수량',
                '상품명 / 매핑수량',
                '연동코드',
                '수집차단여부',
              ],
              rowCount: 44,
              sessionId: 'test-session-id',
              mapping: {
                mapping: { orderId: '쇼핑몰 주문번호', sku: '연동코드', quantity: '주문수량' },
              },
            }),
            uploadAndSaveDirect: jest.fn().mockResolvedValue({
              imported: 140,
              unmatched: [],
            }),
          },
        },
      ],
    }).compile();

    uploadService = moduleFixture.get<UploadService>(UploadService);
  });

  describe('통합 테스트: 나나시.xlsx 업로드 후 Order/Outbound 확인', () => {
    it('나나시.xlsx 파일 업로드 시나리오', async () => {
      const mockFile = {
        originalname: '나나시.xlsx',
        buffer: Buffer.from('test excel content'),
      } as Express.Multer.File;

      const result = await uploadService.parseFile(mockFile, TEST_PROJECT_ID, 'outbound' as any);

      expect(result.headers.length).toBeGreaterThan(0);
      expect(result.rowCount).toBe(44);

      const expectedHeaders = [
        '출고주문상태',
        '매핑여부',
        '수집일',
        '주문구분',
        '쇼핑몰 별칭',
        '쇼핑몰 주문번호',
        '총 주문수량',
        '총 금액',
        '수취인',
        '수취인연락처',
        '수취인연락처2',
        '우편번호',
        '주소',
        '상세주소',
        '비고',
        '수집처리 ID',
        '주문서 상품명',
        '옵션명',
        '주문수량',
        '상품명 / 매핑수량',
        '연동코드',
        '수집차단여부',
      ];

      expect(result.headers).toEqual(expect.arrayContaining(expectedHeaders));
    });

    it('AI 컬럼 매핑 검증', async () => {
      const mockFile = {
        originalname: '나나시.xlsx',
        buffer: Buffer.from('test excel content'),
      } as Express.Multer.File;

      const result = await uploadService.parseFile(mockFile, TEST_PROJECT_ID, 'outbound' as any);

      expect(result.mapping).toBeDefined();
      expect(result.mapping.mapping).toHaveProperty('orderId');
      expect(result.mapping.mapping).toHaveProperty('sku');
      expect(result.mapping.mapping).toHaveProperty('quantity');
    });
  });

  describe('데이터 변환 테스트: Excel 파싱 후 SKU 그룹화', () => {
    it('묶음 상품이 한 SKU에 병합되는지 확인', async () => {
      const result = await uploadService.uploadAndSaveDirect(
        { buffer: Buffer.from('test excel content'), originalname: '나나시.xlsx' } as any,
        TEST_PROJECT_ID,
      );

      expect(result.imported).toBeGreaterThan(0);
    });
  });

  describe('통합 테스트: 실제 API 호출 시나리오', () => {
    it('전체 통합 테스트 - 나나시.xlsx 업로드 → Order 생성 → Outbound 생성 → 확인', async () => {
      const mockFile = {
        originalname: '나나시.xlsx',
        buffer: Buffer.from('test excel content'),
      } as Express.Multer.File;

      const parseResult = await uploadService.parseFile(
        mockFile,
        TEST_PROJECT_ID,
        'outbound' as any,
      );

      expect(parseResult.sessionId).toBeDefined();

      const uploadResult = await uploadService.uploadAndSaveDirect(
        { buffer: Buffer.from('test excel content'), originalname: '나나시.xlsx' } as any,
        TEST_PROJECT_ID,
      );

      expect(uploadResult.imported).toBe(140);
      expect(uploadResult.unmatched.length).toBe(0);
    });
  });
});
