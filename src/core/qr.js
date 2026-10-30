const cache = new Map();
const FONT = '"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
const fileName = code => `qr-organisasi-${code}.png`;

export function qrDataUrl(code, size = 480) {
  const k = code + '|' + size;
  if (!cache.has(k)) {
    cache.set(k, import('qrcode').then(m => (m.default || m).toDataURL(code, {
      errorCorrectionLevel: 'M', margin: 1, width: size, color: { dark: '#10231c', light: '#ffffff' },
    })).catch(e => { cache.delete(k); throw e; }));
  }
  return cache.get(k);
}
export function fillQr(img, code, size = 480) {
  if (!img) return;
  qrDataUrl(code, size).then(u => { if (img.isConnected) img.src = u; }).catch(() => { img.alt = 'QR gagal dibuat'; });
}

export async function qrBlob(code, className = '') {
  const img = new Image(); img.src = await qrDataUrl(code, 800); await img.decode();
  const W = 960, H = 1110, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  x.drawImage(img, 80, 60, 800, 800);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.fillStyle = '#10231c'; x.font = `800 64px ${FONT}`; x.fillText(code, W / 2, 960);
  if (className) { x.fillStyle = '#5c6b64'; x.font = `600 34px ${FONT}`; x.fillText(className.slice(0, 40), W / 2, 1030); }
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
}
function saveBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export async function downloadQr(code, className) { saveBlob(await qrBlob(code, className), fileName(code)); }

export async function shareQr(code, className) {
  const blob = await qrBlob(code, className), file = new File([blob], fileName(code), { type: 'image/png' });
  const text = `Gabung ${className || 'organisasi'} di Kas Organisasi pakai kode ${code} atau scan QR ini.`;
  const withFile = { files: [file], title: 'QR Kas Organisasi', text };
  try {
    if (navigator.canShare && navigator.canShare(withFile)) { await navigator.share(withFile); return 'shared'; }
    if (navigator.share) { await navigator.share({ title: 'Kas Organisasi', text }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'shared'; }
  saveBlob(blob, fileName(code)); return 'downloaded';
}