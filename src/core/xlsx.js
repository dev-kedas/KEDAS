const enc = new TextEncoder(), dec = new TextDecoder();

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const concat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out; };

function zip(files) {
  const local = [], central = []; let offset = 0;
  files.forEach(({ name, data }) => {
    const nb = enc.encode(name), crc = crc32(data), size = data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nb.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
    ch.setUint16(28, nb.length, true); ch.setUint32(42, offset, true);
    local.push(new Uint8Array(lh.buffer), nb, data);
    central.push(new Uint8Array(ch.buffer), nb);
    offset += 30 + nb.length + size;
  });
  const cd = concat(central);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cd.length, true); end.setUint32(16, offset, true);
  return concat([...local, cd, new Uint8Array(end.buffer)]);
}

async function inflate(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let e = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('bukan file xlsx');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
  const out = {};
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bukan file xlsx');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nlen));
    const start = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    const data = bytes.subarray(start, start + csize);
    out[name] = method === 0 ? data : await inflate(data);
    p += 46 + nlen + xlen + clen;
  }
  return out;
}

const colName = i => { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const xmlText = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const STYLE = { head: 1, money: 2 };

function sheetXml(sheet) {
  const all = [sheet.head, ...sheet.rows];
  const width = sheet.head.map((h, c) => Math.min(48, Math.max(12, ...all.map(r => String(r[c] ?? '').length + 2))));
  const cols = `<cols>${width.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
  const data = all.map((r, ri) => `<row r="${ri + 1}">${r.map((v, c) => {
    const ref = colName(c) + (ri + 1);
    if (v === '' || v == null) return '';
    const style = ri === 0 ? STYLE.head : sheet.money && sheet.money.includes(c) ? STYLE.money : 0;
    const s = style ? ` s="${style}"` : '';
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlText(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export function buildXlsx(sheets) {
  const sheetFiles = sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s)) }));
  const wbRels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
    + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  const overrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const files = [
    { name: '[Content_Types].xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`) },
    { name: '_rels/.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: 'xl/workbook.xml', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels}</Relationships>`) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    ...sheetFiles,
  ];
  return zip(files);
}

const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const attr = (s, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(s); return m ? unesc(m[1]) : null; };
const colIndex = letters => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export async function readXlsx(input) {
  const files = await unzip(new Uint8Array(input));
  const text = n => (files[n] ? dec.decode(files[n]) : null);
  const wb = text('xl/workbook.xml'), rels = text('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('bukan file xlsx');
  const sst = [];
  const sstXml = text('xl/sharedStrings.xml');
  if (sstXml) for (const si of sstXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    sst.push([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => unesc(t[1])).join(''));
  }
  const relTarget = {};
  for (const r of rels.matchAll(/<Relationship\b([^>]*)\/>/g)) relTarget[attr(r[1], 'Id')] = attr(r[1], 'Target');

  const out = {};
  for (const sh of wb.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const name = attr(sh[1], 'name'), target = relTarget[attr(sh[1], 'r:id')];
    const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
    const xml = text(path); if (!xml) continue;
    const grid = [];
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(c[1], 'r'), type = attr(c[1], 't'), inner = c[2] || '';
      const m = /^([A-Z]+)(\d+)$/.exec(ref || ''); if (!m) continue;
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner), is = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
      let val = '';
      if (type === 's' && v) val = sst[+v[1]] ?? '';
      else if (type === 'inlineStr' && is) val = unesc(is[1]);
      else if (v) val = unesc(v[1]);
      const r = +m[2] - 1, col = colIndex(m[1]);
      (grid[r] = grid[r] || [])[col] = val;
    }
    out[name] = Array.from(grid, row => Array.from(row || [], v => v ?? ''));
  }
  return out;
}