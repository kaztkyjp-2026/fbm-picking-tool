/**
 * index.js — モール自動判別
 */

import { parseAmazon } from './amazon.js';
import { parseRakuten } from './rakuten.js';
import { parseMercari } from './mercari.js';
import { WarningCollector } from './base.js';

export function detectMall(buffer) {
  const sample = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 2000));
  if (sample.includes('fulfillment-channel') || sample.includes('Fulfillment Channel')) return 'amazon';
  if (sample.includes('注文ステータス') || sample.includes('SKU管理番号')) return 'rakuten';
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
      warnings.add('モールを自動判別できませんでした。対応モール: Amazon / 楽天 / メルカリShops');
      return { mall: 'unknown', orders: [] };
  }
}
