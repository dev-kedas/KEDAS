// Gambar pratinjau link bagikan (1200x630): ringkasan dashboard — saldo, pemasukan, pengeluaran.
// Sengaja TANPA riwayat transaksi dan tanpa nama anggota. Dibuat di browser admin lalu diunggah,
// supaya crawler WhatsApp/Telegram bisa mengambilnya sebagai og:image.
import { rp, fmt } from './utils.js';

const W = 1200, H = 630, FONT = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function fit(g, text, weight, max, min, width) {
  let px = max; g.font = `${weight} ${px}px ${FONT}`;
  while (px > min && g.measureText(text).width > width) { px -= 2; g.font = `${weight} ${px}px ${FONT}`; }
  return px;
}
const money = n => rp(Math.abs(n)).replace(/^Rp\s?/, '');
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function arrow(g, cx, cy, down, color) {
  g.strokeStyle = color; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
  const d = down ? 1 : -1;
  g.beginPath(); g.moveTo(cx, cy - 10 * d); g.lineTo(cx, cy + 10 * d);
  g.moveTo(cx - 9, cy + 1 * d); g.lineTo(cx, cy + 10 * d); g.lineTo(cx + 9, cy + 1 * d); g.stroke();
}
function statCard(g, x, y, w, h, tone, label, value) {
  const c = tone === 'in' ? { fg: '#14804a', bg: '#dff3e8' } : { fg: '#c0392b', bg: '#fbe3e0' };
  g.save(); g.shadowColor = 'rgba(16,35,28,.10)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  g.fillStyle = '#ffffff'; rr(g, x, y, w, h, 26); g.fill(); g.restore();
  g.strokeStyle = '#dde6e1'; g.lineWidth = 2; rr(g, x, y, w, h, 26); g.stroke();
  g.fillStyle = c.bg; g.beginPath(); g.arc(x + 70, y + 66, 32, 0, Math.PI * 2); g.fill();
  arrow(g, x + 70, y + 66, tone === 'in', c.fg);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillStyle = '#5d6f67'; g.font = `600 25px ${FONT}`; g.fillText(label, x + 124, y + 76);
  const t = money(value), pad = 40, avail = w - pad * 2;
  g.fillStyle = c.fg; g.font = `800 28px ${FONT}`; const rw = g.measureText('Rp').width + 10;
  const px = fit(g, t, 800, 60, 30, avail - rw);
  g.fillStyle = c.fg; g.font = `800 ${Math.round(px * .5)}px ${FONT}`; g.fillText('Rp', x + pad, y + h - 38);
  const rw2 = g.measureText('Rp').width + 10;
  g.font = `800 ${px}px ${FONT}`; g.fillText(t, x + pad + rw2, y + h - 38);
}

export async function renderShareCard({ className, balance, income, expense, date }) {
  try { await Promise.all([document.fonts.load(`800 40px ${FONT}`), document.fonts.load(`600 24px ${FONT}`)]); } catch { }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.textBaseline = 'alphabetic';

  g.fillStyle = '#eef3f0'; g.fillRect(0, 0, W, H);

  // header: logo + nama + tanggal
  const logo = await loadImg('/logo.svg');
  if (logo) g.drawImage(logo, 64, 38, 64, 64);
  g.textAlign = 'left'; g.fillStyle = '#10231c'; g.font = `800 32px ${FONT}`; g.fillText('Kas Organisasi', 146, 66);
  g.fillStyle = '#5d6f67'; fit(g, className, 600, 24, 16, 560); g.fillText(className, 146, 98);
  g.textAlign = 'right'; g.fillStyle = '#44574f'; g.font = `600 23px ${FONT}`;
  g.fillText(`Per ${fmt(date, { day: 'numeric', month: 'long', year: 'numeric' })}`, W - 64, 78);

  // hero: saldo
  const neg = balance < 0, hx = 64, hy = 132, hw = W - 128, hh = 214;
  const grad = g.createLinearGradient(hx, hy, hx + hw, hy + hh);
  if (neg) { grad.addColorStop(0, '#8e2a20'); grad.addColorStop(1, '#c0392b'); } else { grad.addColorStop(0, '#0b3d2e'); grad.addColorStop(1, '#14654c'); }
  g.save(); g.shadowColor = 'rgba(14,77,58,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  g.fillStyle = grad; rr(g, hx, hy, hw, hh, 30); g.fill(); g.restore();
  g.save(); rr(g, hx, hy, hw, hh, 30); g.clip();
  g.fillStyle = 'rgba(255,255,255,.07)';
  for (let x = hx + 10; x < hx + hw; x += 16) for (let y = hy + 10; y < hy + hh; y += 16) g.fillRect(x, y, 2, 2);
  g.restore();
  g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `600 27px ${FONT}`; g.fillText('Saldo kas saat ini', hx + 48, hy + 58);
  const t = (neg ? '−' : '') + money(balance), avail = hw - 96;
  g.font = `800 52px ${FONT}`; const rw = g.measureText('Rp').width + 12;
  const px = fit(g, t, 800, 108, 48, avail - rw);
  g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(px * .46)}px ${FONT}`;
  const base = hy + hh - 40; g.fillText('Rp', hx + 48, base);
  const rw2 = g.measureText('Rp').width + 12;
  g.font = `800 ${px}px ${FONT}`; g.fillText(t, hx + 48 + rw2, base);

  // pemasukan & pengeluaran
  const cy = 374, ch = 178, gap = 32, cw = (hw - gap) / 2;
  statCard(g, hx, cy, cw, ch, 'in', 'Total pemasukan', income);
  statCard(g, hx + cw + gap, cy, cw, ch, 'out', 'Total pengeluaran', expense);

  g.textAlign = 'center'; g.fillStyle = '#7a8b83'; g.font = `600 21px ${FONT}`;
  g.fillText('Masuk sebagai siswa organisasi ini untuk melihat detail lengkapnya', W / 2, 598);

  const toBlob = q => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('gagal membuat gambar')), 'image/jpeg', q));
  let q = 0.92, b = await toBlob(q);
  while (b.size > 280000 && q > 0.55) { q -= 0.1; b = await toBlob(q); }
  return b;
}
