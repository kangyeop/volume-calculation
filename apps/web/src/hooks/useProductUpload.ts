import { useCreateProducts } from '@/hooks/queries';
import { useUploadState } from './useUploadState';
import { useExcelDateConversion } from './useExcelDateConversion';
import { Product } from '@wms/types';

export const useProductUpload = (projectId: string) => {
  const createProducts = useCreateProducts(projectId);
  const { excelDateToISOString } = useExcelDateConversion();
  const uploadState = useUploadState();

  const processWithHardcodedMapping = async (rawData: Record<string, unknown>[]) => {
    const newErrors: string[] = [];
    const validData: Omit<Product, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

    rawData.forEach((item, index) => {
      const rowNum = index + 1;
      const productName = String(item['상품명'] || item.name || '').trim();

      if (!productName) {
        return;
      }

      let width = 0;
      let length = 0;
      let height = 0;

      const findValue = (keys: string[]) => {
        for (const key of keys) {
          if (
            item[key] !== undefined &&
            item[key] !== null &&
            String(item[key]).trim() !== ''
          ) {
            return item[key];
          }
        }
        return undefined;
      };

      const wVal = findValue(['가로', 'width', 'Width', 'W', 'w']);
      const lVal = findValue([
        '세로',
        'length',
        'Length',
        'L',
        'l',
        'depth',
        'Depth',
        'D',
        'd',
      ]);
      const hVal = findValue(['높이', 'height', 'Height', 'H', 'h']);
      const weightVal = findValue(['무게', 'weight', 'Weight', 'Kg', 'kg', 'KG']);

      if (wVal) width = parseFloat(String(wVal));
      if (lVal) length = parseFloat(String(lVal));
      if (hVal) height = parseFloat(String(hVal));
      let weight = 0;
      if (weightVal) weight = parseFloat(String(weightVal));

      const volumeStr = String(item['체적정보'] || '');
      if ((!width || !length || !height) && volumeStr) {
        const widthMatch = volumeStr.match(/(?:가로|Width|W)\s*[:-]?\s*(\d+(\.\d+)?)/i);
        const lengthMatch = volumeStr.match(
          /(?:세로|Length|L|Depth|D)\s*[:-]?\s*(\d+(\.\d+)?)/i,
        );
        const heightMatch = volumeStr.match(/(?:높이|Height|H)\s*[:-]?\s*(\d+(\.\d+)?)/i);

        if (!width && widthMatch) width = parseFloat(widthMatch[1]);
        if (!length && lengthMatch) length = parseFloat(lengthMatch[1]);
        if (!height && heightMatch) height = parseFloat(heightMatch[1]);

        if (!width && !length && !height) {
          const dimensions = volumeStr.match(
            /(\d+(\.\d+)?)\s*[*xX]\s*(\d+(\.\d+)?)\s*[*xX]\s*(\d+(\.\d+)?)/,
          );
          if (dimensions) {
            width = parseFloat(dimensions[1]);
            length = parseFloat(dimensions[3]);
            height = parseFloat(dimensions[5]);
          }
        }
      }

      const missingFields = [];
      if (!width || width <= 0) missingFields.push('Width (가로)');
      if (!length || length <= 0) missingFields.push('Length (세로)');
      if (!height || height <= 0) missingFields.push('Height (높이)');

      if (missingFields.length > 0) {
        newErrors.push(
          `Row ${rowNum} (${productName}): Missing or invalid dimensions - ${missingFields.join(', ')}`,
        );
      } else {
        validData.push({
          sku: productName,
          name: productName,
          width,
          length,
          height,
          weight: weight || 0,
          inboundDate: excelDateToISOString(
            (item['입고일'] as string | number | undefined) ??
              (item.inboundDate as string | number | undefined),
          ),
          outboundDate: excelDateToISOString(
            (item['출고일'] as string | number | undefined) ??
              (item.outboundDate as string | number | undefined),
          ),
          barcode: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(
            String(item['바코드'] || item.barcode).toLowerCase(),
          ),
          aircap: ['ㅇ', 'o', 'true', 'yes', 'y'].includes(
            String(item['에어캡'] || item.aircap).toLowerCase(),
          ),
          remarks: (item['비고'] || item.remarks) as string | undefined,
        });
      }
    });

    if (newErrors.length > 0) {
      uploadState.setErrors(newErrors);
    } else if (validData.length > 0) {
      await createProducts.mutateAsync(validData);
    }
  };

  const fallbackUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = (window as unknown as { XLSX: { read: any } }).XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = (window as unknown as { XLSX: { utils: { sheet_to_json: any } } }).XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      if (rawData.length > 0) {
        const headerRow = 2;
        const dataRows = rawData.slice(headerRow).map(row => {
          const item: Record<string, unknown> = {};
          const headers = rawData[headerRow] as string[];
          headers.forEach((header, index) => {
            item[header] = (row as unknown[])[index];
          });
          return item;
        }) as Record<string, unknown>[];

        await processWithHardcodedMapping(dataRows);
      }
    };
    reader.readAsBinaryString(file);
  };

  return {
    ...uploadState,
    processWithHardcodedMapping,
    fallbackUpload,
    createProducts,
  };
};