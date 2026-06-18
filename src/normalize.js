/**
 * normalize.js — マスタ突合・出荷区分R列・レシピ展開
 *
 * 商品マスタ構造（18列 A〜R）:
 *   R列（18列目）= 出荷区分フラグ。ヘッダー表記は「自社」だが意味は自社/外注の2値。
 *   全88件が現在「自社」。
 *
 * クロスウォーク突合（メルカリ）:
 *   original_product_id → ASIN列 or AmazonSKU列を横断照合（大文字正規化）
 *
 * レシピ展開:
 *   セット構成テーブルの列名: セットMID / 構成MID / 数量
 *   事前組立セット品（assembled=true）は展開せず親MIDのまま1単位
 */

export function buildMasterMap(masterRows) {
  // masterRows: CSVオブジェクト配列（商品マスタ）
  // キー: MID, AmazonSKU, ASIN → MIDへの逆引きマップ
  const byMID = {};
  const byAmazonSKU = {};
  const byASIN = {};

  for (const row of masterRows) {
    const mid = (row['MID'] || '').trim();
    if (!mid) continue;
    byMID[mid] = row;

    const sku = (row['AmazonSKU'] || '').trim().toUpperCase();
    if (sku) byAmazonSKU[sku] = mid;

    const asin = (row['ASIN'] || '').trim().toUpperCase();
    if (asin) byASIN[asin] = mid;
  }
  return { byMID, byAmazonSKU, byASIN };
}

export function buildRecipeMap(recipeRows) {
  // recipeRows: セット構成テーブル（セットMID / 構成MID / 数量）
  const map = {};
  for (const row of recipeRows) {
    const setMID = (row['セットMID'] || '').trim();
    const compMID = (row['構成MID'] || '').trim();
    const qty = parseInt(row['数量'] || '1', 10) || 1;
    if (!setMID || !compMID) continue;
    if (!map[setMID]) map[setMID] = [];
    map[setMID].push({ compMID, qty });
  }
  return map;
}

export function resolveOrders(parsedOrders, masterMap, recipeMap, warnings) {
  // parsedOrders: パーサ出力の配列
  // 戻り値: 正規化レコード配列 { mall, orderId, mid, name, quantity, location }
  const { byMID, byAmazonSKU, byASIN } = masterMap;
  const normalized = [];

  for (const order of parsedOrders) {
    let mid = null;

    if (order.mall === 'メルカリ' && order.originalProductId) {
      // ASIN or AmazonSKU 横断照合
      const key = order.originalProductId.toUpperCase();
      mid = byASIN[key] || byAmazonSKU[key] || null;
      if (!mid) {
        warnings.add(`[メルカリ] order_id=${order.orderId} original_product_id=${order.originalProductId} → MID未解決`);
        continue;
      }
    } else if (order.sku) {
      mid = byAmazonSKU[order.sku.toUpperCase()] || null;
      if (!mid) {
        warnings.add(`[${order.mall}] order_id=${order.orderId} SKU=${order.sku} → MID未解決`);
        continue;
      }
    } else {
      // needsManual
      continue;
    }

    const masterRow = byMID[mid];
    if (!masterRow) {
      warnings.add(`[${order.mall}] MID=${mid} マスタ行なし`);
      continue;
    }

    // 出荷区分チェック（R列・18列目・ヘッダー「自社」）
    const shipType = (masterRow['自社'] || masterRow['出荷区分'] || 'self').trim();
    if (shipType === '外注') continue; // 外注は除外

    // レシピ展開
    const recipes = recipeMap[mid];
    if (recipes && recipes.length > 0) {
      // セット品 → 構成品へ展開
      for (const { compMID, qty: recipeQty } of recipes) {
        const compRow = byMID[compMID];
        normalized.push({
          mall: order.mall,
          orderId: order.orderId,
          mid: compMID,
          name: compRow ? (compRow['商品名'] || compMID) : compMID,
          location: compRow ? (compRow['ロケーション'] || '') : '',
          quantity: order.quantity * recipeQty,
          isComponent: true,
          parentMID: mid
        });
      }
    } else {
      // 単品 or 事前組立セット品（展開しない）
      normalized.push({
        mall: order.mall,
        orderId: order.orderId,
        mid,
        name: masterRow['商品名'] || mid,
        location: masterRow['ロケーション'] || '',
        quantity: order.quantity,
        isComponent: false
      });
    }
  }
  return normalized;
}
