/**
 * rakuten.js — 楽天パーサ
 * 抽出条件: status=300（発送待ち）のみ
 * 注文ステータス: 100=注文確認待ち, 200=入金確認中, 300=発送待ち, 500=発送済み, 900=キャンセル
 * SKU管理番号(列155): 大文字正規化してクロスウォーク突合
 */

import { decodeBuffer, parseCSV, csvToObjects, WarningCollector } from './base.js';

export function parseRakuten(buffer, warnings) {
  const text = decodeBuffer(buffer);
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const objects = csvToObjects(rows);

  const results = [];
  for (const row of objects) {
    const status = row['注文ステータス'] || row['status'] || '';
    if (status !== '300') continue;

    const skuMgmtNo = (row['SKU管理番号'] || '').trim().toUpperCase();
    const qty = parseInt(row['数量'] || '1', 10) || 1;
    const orderId = row['注文番号'] || '';

    if (!skuMgmtNo) {
      warnings.add(`[楽天] 注文番号=${orderId} SKU管理番号空欄 → スキップ`);
      continue;
    }

    results.push({
      mall: '楽天',
      orderId,
      sku: skuMgmtNo,  // 大文字正規化済み
      quantity: qty,
      raw: row
    });
  }
  return results;
}
