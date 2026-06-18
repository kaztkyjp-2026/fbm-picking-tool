/**
 * output.js — トータル/シングル・閾値判定・印刷HTML
 *
 * トータルリスト: 構成品MID別の合計数（「100g袋を6つ取る」式）
 * シングルリスト: 注文別の仕分け指示
 * 件数閾値: 10:30時点の注文数が threshold 以下なら朝出しスキップ
 */

export function buildTotalList(normalizedOrders) {
  const totals = {};
  for (const order of normalizedOrders) {
    if (!totals[order.mid]) {
      totals[order.mid] = { mid: order.mid, name: order.name, location: order.location, quantity: 0 };
    }
    totals[order.mid].quantity += order.quantity;
  }
  return Object.values(totals).sort((a, b) => (a.location || '').localeCompare(b.location || '') || a.name.localeCompare(b.name));
}

export function buildSingleList(normalizedOrders) {
  const orders = {};
  for (const order of normalizedOrders) {
    if (!orders[order.orderId]) {
      orders[order.orderId] = { orderId: order.orderId, mall: order.mall, items: [] };
    }
    orders[order.orderId].items.push({ mid: order.mid, name: order.name, quantity: order.quantity });
  }
  return Object.values(orders);
}

export function shouldSkipMorning(orderCount, threshold = 10) {
  return orderCount <= threshold;
}

export function renderTotalHTML(totalList, date, warnings) {
  const warningHTML = warnings.length > 0
    ? `<div class="warnings"><h3>⚠️ 警告 (${warnings.length}件)</h3><ul>${warnings.map(w => `<li>${escHtml(w)}</li>`).join('')}</ul></div>`
    : '';

  const rows = totalList.map(item => `
    <tr>
      <td class="check"><input type="checkbox"></td>
      <td class="location">${escHtml(item.location)}</td>
      <td class="name">${escHtml(item.name)}</td>
      <td class="mid">${escHtml(item.mid)}</td>
      <td class="qty">${item.quantity}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<title>トータルピッキングリスト ${date}</title>
<style>
  body { font-family: sans-serif; font-size: 16px; margin: 20px; }
  h1 { font-size: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 8px 12px; }
  th { background: #eee; }
  .check { width: 40px; text-align: center; }
  .qty { width: 60px; text-align: right; font-weight: bold; font-size: 18px; }
  .location { width: 80px; }
  .warnings { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; margin-bottom: 16px; }
  @media print { .warnings { display: none; } input[type=checkbox] { width: 20px; height: 20px; } }
</style></head><body>
<h1>📦 トータルピッキングリスト — ${escHtml(date)}</h1>
<p>合計 ${totalList.length} SKU / ${totalList.reduce((s,i)=>s+i.quantity,0)} 個</p>
${warningHTML}
<table>
  <thead><tr><th>✓</th><th>場所</th><th>商品名</th><th>MID</th><th>数量</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
}

export function renderSingleHTML(singleList, date) {
  const orders = singleList.map(order => {
    const items = order.items.map(item =>
      `<tr><td>${escHtml(item.name)}</td><td>${escHtml(item.mid)}</td><td class="qty">${item.quantity}</td></tr>`
    ).join('');
    return `
    <div class="order">
      <h3>${escHtml(order.mall)} — ${escHtml(order.orderId)}</h3>
      <table><thead><tr><th>商品名</th><th>MID</th><th>数量</th></tr></thead>
      <tbody>${items}</tbody></table>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<title>シングルピッキングリスト ${date}</title>
<style>
  body { font-family: sans-serif; font-size: 15px; margin: 20px; }
  h1 { font-size: 20px; }
  .order { margin-bottom: 24px; page-break-inside: avoid; }
  h3 { font-size: 16px; background: #eee; padding: 6px 10px; margin: 0 0 4px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #333; padding: 6px 10px; }
  th { background: #f5f5f5; }
  .qty { width: 60px; text-align: right; font-weight: bold; }
  @media print { .order { page-break-inside: avoid; } }
</style></head><body>
<h1>📋 シングルピッキングリスト — ${escHtml(date)}</h1>
<p>合計 ${singleList.length} 注文</p>
${orders}
</body></html>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
