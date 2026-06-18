/**
 * index.js — モール自動判別
 * .txt（TSV）および .csv（CSV）に対応
 */

import { parseAmazon } from './amazon.js';
import { parseRakuten } from './rakuten.js';
import { parseMercari } from './mercari.js';
import { WarningCollector, decodeBuffer } from './base.js';

export function detectMall(buffer) {
  const sample = decodeBuffer(buffer.slice(0, 3000));
  // Amazon: TSV（未出荷レポート）またはCSV（全注文レポート）
  if (sample.includes('order-id') && (sample.includes('quantity-to-ship') || sample.includes('fulfillment-channel'))) return 'amazon';
  // 楽天
  if (sample.includes('注文ステータス') || sample.includes('SKU管理番号')) return 'rakuten';
  // メルカリ
  if (sample.includes('original_product_id') || sample.includes('order_id')) return 'mercari';
  return 'unknown';
}

export function parseOrders(buffer, warnings) {
  const mall = detectMall(buffer);
  switch (mall) {
    case 'amazon':  return { mall, orders: parseAmazon(buffer, warnings) };
    case 'rakuten': return { mall, orders: parseRakuten(buffer, warnings) };
    case 'mercari': return { mall, orders: parseMercari(buffer, warnings) };
    default:
      warnings.add('モールを自動判別できませんでした。対応モール: Amazon（未出荷レポート.txt / 全注文レポート.csv） / 楽天 / メルカリShops');
      return { mall: 'unknown', orders: [] };
  }
}
