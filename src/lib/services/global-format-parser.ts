/**
 * v1 placeholder — delegates to the domestic parser. v2 will either replace this
 * implementation or validate the domestic parser is correct for global column layouts.
 * Do NOT import the domestic parser directly from anywhere else in the global domain.
 */
import { parseByFormat, type ShipmentFormat, type ParsedOrderItem } from '@/lib/services/format-parser';

export type GlobalShipmentFormat = ShipmentFormat;
export type GlobalParsedOrderItem = ParsedOrderItem;

export function parseGlobalByFormat(
  format: GlobalShipmentFormat,
  rows: Record<string, unknown>[],
): GlobalParsedOrderItem[] {
  return parseByFormat(format, rows);
}
