import { AIService } from './ai.service';
import { RowNormalizerService } from './rowNormalizer.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import XLSX = require('xlsx');
import * as path from 'path';
import * as fs from 'fs';

const TEST_FILE = path.resolve(process.env.HOME!, 'Downloads/03월 윈터.xlsx');

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(fs.existsSync(TEST_FILE))('AIService Integration - Compound Detection', () => {
  let aiService: AIService;
  let rowNormalizer: RowNormalizerService;
  let headers: string[];
  let allRows: Record<string, unknown>[];
  let sampleRows: Record<string, unknown>[];

  beforeAll(() => {
    const configService = { get: (_key: string, defaultValue?: any) => defaultValue } as any;
    const productsRepository = {} as any;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');

    aiService = new AIService(apiKey, productsRepository, configService);
    rowNormalizer = new RowNormalizerService();

    const wb = XLSX.readFile(TEST_FILE);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
    headers = raw[0];
    allRows = raw.slice(1).map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, j) => { if (row[j] !== undefined) obj[h] = row[j]; });
      return obj;
    });

    const compoundRows = allRows.filter((row) => {
      const val = String(row['상품명 / 매핑수량'] || '');
      return val.includes('\r\n');
    });
    const singleRows = allRows.filter((row) => {
      const val = String(row['상품명 / 매핑수량'] || '');
      return !val.includes('\r\n');
    });
    sampleRows = [
      ...singleRows.slice(0, 5),
      ...compoundRows.slice(0, 5),
    ];
  }, 10000);

  it('should detect compound products with correct delimiter', async () => {
    const result = await aiService.detectCompoundProducts(headers, sampleRows);

    expect(result.detected).toBe(true);
    expect(result.delimiter).toMatch(/\\?r?\\?n|(\r?\n)/);
    const unescaped = result.delimiter!.replace(/\\r\\n/g, '\r\n').replace(/\\n/g, '\n');
    expect(unescaped).toMatch(/\r?\n/);
    expect(result.itemPattern).toBeDefined();
    expect(result.parsedSamples).toBeDefined();
    expect(result.parsedSamples!.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('parsedSamples.raw should not contain the delimiter (must be split items)', async () => {
    const result = await aiService.detectCompoundProducts(headers, sampleRows);

    if (!result.detected || !result.delimiter || !result.parsedSamples) return;

    for (const sample of result.parsedSamples) {
      expect(sample.raw).not.toContain(result.delimiter);
    }
  }, 30000);

  it('parsedSamples should have valid productName and quantity', async () => {
    const result = await aiService.detectCompoundProducts(headers, sampleRows);

    if (!result.parsedSamples) return;

    for (const sample of result.parsedSamples) {
      expect(sample.productName.length).toBeGreaterThan(0);
      expect(sample.quantity).toBeGreaterThanOrEqual(1);
      expect(sample.raw).toContain(sample.productName);
    }
  }, 30000);

  it('rowNormalizer should correctly split compound rows using detection result', async () => {
    const result = await aiService.detectCompoundProducts(headers, sampleRows);

    const compoundRow = allRows.find((row) => {
      const val = String(row['상품명 / 매핑수량'] || '');
      return val.includes('\r\n');
    });

    if (!compoundRow || !result.detected) return;

    const columnMapping = { sku: '상품명 / 매핑수량', quantity: '주문수량' };
    const normalized = rowNormalizer.normalizeRows([compoundRow], columnMapping, result);

    expect(normalized.length).toBeGreaterThan(1);

    for (const row of normalized) {
      const sku = String(row['상품명 / 매핑수량']);
      expect(sku).not.toContain('\r\n');
      expect(sku).not.toMatch(/^\(/);
    }
  }, 30000);

  it('known pattern should parse (상품명 / Nea) without AI regex', () => {
    const testCases = [
      { raw: '(스코_윈터_쿠션_오토 / 1ea)', expectedName: '스코_윈터_쿠션_오토', expectedQty: 1 },
      { raw: '(스코_윈터_쿠션패치_오토 / 1ea)', expectedName: '스코_윈터_쿠션패치_오토', expectedQty: 1 },
      { raw: '(스코_윈터_키링_니노 / 1ea)', expectedName: '스코_윈터_키링_니노', expectedQty: 1 },
      { raw: '(V_01167)', expectedName: 'V_01167', expectedQty: null },
    ];

    const columnMapping = { sku: 'sku', quantity: 'qty' };

    for (const tc of testCases) {
      const detection = {
        detected: true as const,
        delimiter: '\r\n',
        itemPattern: null,
        parsedSamples: null,
      };

      const rows = [{ sku: `${tc.raw}\r\n${tc.raw}`, qty: 1 }];
      const normalized = rowNormalizer.normalizeRows(rows, columnMapping, detection);

      expect(normalized).toHaveLength(2);
      expect(normalized[0]['sku']).toBe(tc.expectedName);
      if (tc.expectedQty !== null) {
        expect(normalized[0]['qty']).toBe(tc.expectedQty);
      }
    }
  });
});
