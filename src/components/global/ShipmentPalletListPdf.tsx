import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerPdfFonts } from '@/lib/pdf/fonts';
import type { FlatPallet } from '@/lib/pdf/flattenPallets';

registerPdfFonts();

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    color: '#111827',
  },
  headerBlock: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10,
    color: '#4b5563',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  colNo: {
    width: '10%',
    textAlign: 'center',
  },
  colName: {
    width: '40%',
    paddingHorizontal: 6,
  },
  colLot: {
    width: '17%',
    paddingHorizontal: 4,
    fontSize: 9,
  },
  colExp: {
    width: '18%',
    paddingHorizontal: 4,
    fontSize: 9,
  },
  colCartons: {
    width: '15%',
    textAlign: 'right',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#6b7280',
  },
});

export interface ShipmentPalletListPdfProps {
  shipmentLabel: string;
  totalPallets: number;
  pallets: FlatPallet[];
  generatedAt: string;
}

export function ShipmentPalletListPdf({
  shipmentLabel,
  totalPallets,
  pallets,
  generatedAt,
}: ShipmentPalletListPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>파레트 적재 목록</Text>
          <View style={styles.metaRow}>
            <Text>{shipmentLabel}</Text>
            <Text>
              전체 파레트 {totalPallets}개 · {generatedAt}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={styles.colNo}>파레트 번호</Text>
            <Text style={styles.colName}>상품명</Text>
            <Text style={styles.colLot}>로트번호</Text>
            <Text style={styles.colExp}>유통기한</Text>
            <Text style={styles.colCartons}>박스 수</Text>
          </View>
          {pallets.flatMap((p) =>
            p.items.flatMap((item, idx) => {
              const lots = item.lots.length > 0 ? item.lots : [{ lotNumber: null, expirationDate: null, quantity: 0 }];
              return lots.map((lot, lotIdx) => (
                <View key={`${p.no}-${idx}-${lotIdx}`} style={styles.tableRow} wrap={false}>
                  <Text style={styles.colNo}>
                    {idx === 0 && lotIdx === 0
                      ? `${p.no}${p.kind === 'mixed' ? '(혼합)' : ''}`
                      : ''}
                  </Text>
                  <Text style={styles.colName}>{lotIdx === 0 ? item.productName : ''}</Text>
                  <Text style={styles.colLot}>{lot.lotNumber ?? '-'}</Text>
                  <Text style={styles.colExp}>{lot.expirationDate ?? '-'}</Text>
                  <Text style={styles.colCartons}>{lotIdx === 0 ? item.cartons : ''}</Text>
                </View>
              ));
            }),
          )}
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
