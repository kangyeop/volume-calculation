import { useCreateOutbounds } from '@/hooks/queries';
import { useProducts } from '@/hooks/queries';
import { useUploadState } from './useUploadState';
import { Outbound } from '@wms/types';

export const useOutboundUpload = (projectId: string) => {
  const createOutbounds = useCreateOutbounds(projectId);
  const { data: products } = useProducts(projectId);
  const uploadState = useUploadState();

  const productSkus = new Set(products?.map((p) => p.sku) || []);

  const processWithHardcodedMapping = async (rawData: Record<string, unknown>[]) => {
    const newErrors: string[] = [];
    const validData: Omit<Outbound, 'id' | 'projectId' | 'createdAt'>[] = [];

    rawData.forEach((item, index) => {
      const rowNum = index + 1;

      const findValue = (keys: string[]) => {
        for (const key of keys) {
          if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
            return item[key];
          }
        }
        return undefined;
      };

      const orderId = String(findValue(['쇼핑몰주문번호', 'orderId']) || '').trim();
      const sku = String(
        findValue(['연동코드', '상품명 / 매핑수량', 'sku', '주문서상품명']) || '',
      ).trim();
      const quantity = parseInt(String(findValue(['주문수량', 'quantity']) || '1'), 10);
      const recipientName = String(findValue(['수취인', 'recipientName']) || '').trim();

      if (!orderId || !sku) {
        return;
      }

      const validQuantity = isNaN(quantity) || quantity <= 0 ? 1 : quantity;

      if (!productSkus.has(sku)) {
        newErrors.push(`Row ${rowNum}: SKU "${sku}" not found in products. Skipping this row.`);
        return;
      }

      validData.push({
        orderId,
        sku,
        quantity: validQuantity,
        recipientName: recipientName || undefined,
      });
    });

    if (newErrors.length > 0) {
      uploadState.setErrors(newErrors);
    } else if (validData.length > 0) {
      await createOutbounds.mutateAsync(validData);
    }
  };

  const fallbackUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result as ArrayBuffer;
      const XLSX = (
        window as unknown as {
          XLSX: {
            read: (arg: unknown, options?: unknown) => unknown;
            utils: { sheet_to_json: (arg: unknown, options?: unknown) => unknown[] };
          };
        }
      ).XLSX;
      const wb = XLSX.read(bstr, { type: 'array' }) as {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      if (rawData.length > 0) {
        const headerRow = 2;
        const dataRows = rawData.slice(headerRow).map((row) => {
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
    reader.readAsArrayBuffer(file);
  };

  return {
    ...uploadState,
    processWithHardcodedMapping,
    fallbackUpload,
    createOutbounds,
  };
};
