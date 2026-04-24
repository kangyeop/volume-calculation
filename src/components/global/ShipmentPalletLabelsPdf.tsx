import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { registerPdfFonts } from '@/lib/pdf/fonts';
import { totalCartons, type FlatPallet } from '@/lib/pdf/flattenPallets';

registerPdfFonts();

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    color: '#111827',
    paddingVertical: 36,
    paddingHorizontal: 36,
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 10,
  },
  shipmentLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  palletHeading: {
    fontSize: 24,
    fontWeight: 700,
  },
  summaryRow: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#4b5563',
  },
  table: {
    borderWidth: 1,
    borderColor: '#111827',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 700,
    fontSize: 11,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  colNo: {
    width: '6%',
    textAlign: 'center',
    fontSize: 11,
  },
  colSku: {
    width: '16%',
    fontSize: 10,
    paddingRight: 6,
  },
  colName: {
    width: '34%',
    fontSize: 12,
    fontWeight: 700,
    paddingRight: 6,
  },
  colLot: {
    width: '14%',
    fontSize: 10,
    paddingRight: 6,
  },
  colExp: {
    width: '16%',
    fontSize: 10,
    paddingRight: 6,
  },
  colCartons: {
    width: '14%',
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 700,
  },
});

export interface ShipmentPalletLabelsPdfProps {
  shipmentLabel: string;
  totalPallets: number;
  pallets: FlatPallet[];
}

export function ShipmentPalletLabelsPdf({
  shipmentLabel,
  totalPallets,
  pallets,
}: ShipmentPalletLabelsPdfProps) {
  return (
    <Document>
      {pallets.map((p) => {
        const cartonsSum = totalCartons(p);
        return (
          <Page
            key={p.no}
            size="A4"
            orientation="landscape"
            style={styles.page}
            wrap={false}
          >
            <View style={styles.headerRow}>
              <Text style={styles.shipmentLabel}>{shipmentLabel}</Text>
              <Text style={styles.palletHeading}>
                {p.no} / {totalPallets}번 파레트
                {p.kind === 'mixed' ? ' (혼합)' : ''}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text>
                {p.kind === 'mixed' ? '혼합 팔레트 · ' : ''}총 {p.items.length}개 상품
              </Text>
              <Text>총 {cartonsSum} 박스</Text>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colNo}>#</Text>
                <Text style={styles.colSku}>SKU</Text>
                <Text style={styles.colName}>상품명</Text>
                <Text style={styles.colLot}>로트번호</Text>
                <Text style={styles.colExp}>유통기한</Text>
                <Text style={styles.colCartons}>박스 수</Text>
              </View>
              {p.items.flatMap((item, idx) => {
                const isLastItem = idx === p.items.length - 1;
                const lots = item.lots.length > 0 ? item.lots : [{ lotNumber: null, expirationDate: null, quantity: 0 }];
                return lots.map((lot, lotIdx) => {
                  const isLastLot = lotIdx === lots.length - 1;
                  const isLastRow = isLastItem && isLastLot;
                  return (
                    <View
                      key={`${item.sku}-${idx}-${lotIdx}`}
                      style={[styles.tableRow, isLastRow ? styles.tableRowLast : undefined] as never}
                    >
                      <Text style={styles.colNo}>{lotIdx === 0 ? idx + 1 : ''}</Text>
                      <Text style={styles.colSku}>{lotIdx === 0 ? item.sku : ''}</Text>
                      <Text style={styles.colName}>{lotIdx === 0 ? item.productName : ''}</Text>
                      <Text style={styles.colLot}>{lot.lotNumber ?? '-'}</Text>
                      <Text style={styles.colExp}>{lot.expirationDate ?? '-'}</Text>
                      <Text style={styles.colCartons}>{lotIdx === 0 ? item.cartons : ''}</Text>
                    </View>
                  );
                });
              })}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
