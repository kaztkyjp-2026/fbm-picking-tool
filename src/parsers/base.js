/**
 * base.js — 文字コード分岐・CSV解析・警告収集
 */

export function detectEncoding(buffer) {
  // UTF-8 BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return 'utf-8';
  // Shift-JIS ヒューリスティック
  for (let i = 0; i < Math.min(buffer.length - 1, 2000); i++) {
    const b = buffer[i];
    if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) return 'shift-jis';
  }
  return 'utf-8';
}

export function decodeBuffer(buffer) {
  const enc = detectEncoding(buffer);
  const decoder = new TextDecoder(enc);
  let text = decoder.decode(buffer);
  // BOM除去
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  return text;
}

export function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    rows.push(parseCSVLine(line));
  }
  return rows;
}

function parseCSVLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let val = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i+1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { val += line[i++]; }
      }
      fields.push(val);
      if (line[i] === ',') i++;
    } else {
      const end = line.indexOf(',', i);
      if (end === -1) { fields.push(line.slice(i)); break; }
      fields.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return fields;
}

export function csvToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (row[i] || '').trim(); });
    return obj;
  });
}

export class WarningCollector {
  constructor() { this.warnings = []; }
  add(msg) { this.warnings.push(msg); }
  getAll() { return this.warnings; }
  hasWarnings() { return this.warnings.length > 0; }
}
