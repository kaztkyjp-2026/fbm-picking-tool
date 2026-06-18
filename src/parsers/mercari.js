/**
 * mercari.js — メルカリShopsパーサ
 * 文字コード: UTF-8
 * 突合キー: original_product_id → ASIN列 or AmazonSKU列を横断照合
 * FNSKU(x001...形式)はクロスウォーク外のため突合不能 → 警告
 */

import { decodeBuffer, parseCSV, csvToObjects } from './base.js';

export function parseMercari(buffer, warnings) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const objects = csvToObjects(rows);

  const results = [];
  for (const row of objects) {
    const originalProductId = (row['original_product_id'] || '').trim();
    const qty = parseInt(row['quantity'] || '1', 10) || 1;
    const orderId = row['order_id'] || row['id'] || '';

    if (!originalProductId) {
      warnings.add(`[メルカリ] order_id=${orderId} original_product_id空欄 → 手動対応要`);
      results.push({
        mall: 'メルカリ',
        orderId,
        sku: null,
        originalProductId: null,
        quantity: qty,
        needsManual: true,
        raw: row
      });
      continue;
    }

    // FNSKU判定
    if (/^x0[0-9a-f]{2}/i.test(originalProductId)) {
      warnings.add(`[メルカリ] order_id=${orderId} FNSKU検出(${originalProductId}) → クロスウォーク外・突合不能。original_product_idをAmazonSKUに修正してください`);
      results.push({
        mall: 'メルカリ',
        orderId,
        sku: null,
        originalProductId,
        quantity: qty,
        needsManual: true,
        raw: row
      });
      continue;
    }

    results.push({
      mall: 'メルカリ',
      orderId,
      sku: null,  // normalize.jsでAmazonSKU横断照合
      originalProductId: originalProductId.toUpperCase(),
      quantity: qty,
      needsManual: false,
      raw: row
    });
  }
  return results;
}
