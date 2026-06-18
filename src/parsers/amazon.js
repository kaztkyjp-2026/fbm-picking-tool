/**
 * amazon.js — Amazonパーサ
 * 抽出条件: fulfillment-channel=Merchant AND item-status=Unshipped
 *           AND order-status NOT IN (Pending, Cancelled)
 * 注意: 健プラ(30列) / 萬福堂(42列) で列数が異なる → 列名ベースマッピング必須
 */

import { decodeBuffer, parseCSV, csvToObjects, WarningCollector } from './base.js';

export function parseAmazon(buffer, warnings) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const objects = csvToObjects(rows);

  const results = [];
  for (const row of objects) {
    const channel = row['fulfillment-channel'] || row['Fulfillment Channel'] || '';
    const itemStatus = row['item-status'] || row['Item Status'] || '';
    const orderStatus = row['order-status'] || row['Order Status'] || '';
    const sku = row['sku'] || row['SKU'] || '';
    const qty = parseInt(row['quantity-purchased'] || row['Quantity'] || '1', 10) || 1;
    const orderId = row['order-id'] || row['Order ID'] || '';

    // 抽出条件
    if (channel !== 'Merchant') continue;
    if (itemStatus !== 'Unshipped') {
      if (!itemStatus) {
        warnings.add(`[Amazon] order-id=${orderId} item-status空欄 → スキップ（要確認）`);
      }
      continue;
    }
    if (orderStatus === 'Pending' || orderStatus === 'Cancelled') {
      if (orderStatus === 'Pending') {
        warnings.add(`[Amazon] order-id=${orderId} Pending → 除外（決済未確認）`);
      }
      continue;
    }

    if (!sku) {
      warnings.add(`[Amazon] order-id=${orderId} SKU空欄 → スキップ`);
      continue;
    }

    results.push({
      mall: 'Amazon',
      orderId,
      sku: sku.toUpperCase(),
      quantity: qty,
      raw: row
    });
  }
  return results;
}
