/**
 * amazon.js — Amazonパーサ
 *
 * 対応レポート：
 *   A) 未出荷レポート（推奨）: TSV形式 (.txt)
 *      fulfillment-channel / order-status 列なし。quantity-to-ship > 0 で判定。
 *   B) 全注文レポート: TSV/CSV形式
 *      fulfillment-channel=Merchant AND item-status=Unshipped
 *      AND order-status NOT IN (Pending, Cancelled) で判定。
 *
 * 列数差: 健プラ / 萬福堂 で列数が異なる → 列名ベースマッピング必須
 */

import { decodeBuffer, parseCSV, csvToObjects, WarningCollector } from './base.js';

export function parseAmazon(buffer, warnings) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const objects = csvToObjects(rows);

  // レポート種別を自動判定
  const headers = rows[0].map(h => h.trim());
  const isUnshippedReport = !headers.includes('fulfillment-channel') && !headers.includes('order-status');

  const results = [];
  for (const row of objects) {
    const orderId = row['order-id'] || '';
    const sku = (row['sku'] || row['SKU'] || '').trim();
    const qty = parseInt(row['quantity-purchased'] || row['quantity-to-ship'] || '1', 10) || 1;

    if (isUnshippedReport) {
      // 未出荷レポート: quantity-to-ship > 0 のみ
      const toShip = parseInt(row['quantity-to-ship'] || '0', 10);
      if (toShip <= 0) continue;
    } else {
      // 全注文レポート: FBM + Unshipped + NOT(Pending/Cancelled)
      const channel = row['fulfillment-channel'] || row['Fulfillment Channel'] || '';
      const itemStatus = row['item-status'] || row['Item Status'] || '';
      const orderStatus = row['order-status'] || row['Order Status'] || '';

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
