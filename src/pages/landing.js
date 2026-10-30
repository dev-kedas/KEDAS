import '../styles/landing.css';
import { $, ic, esc, fmtNum, parseMoney } from '../core/utils.js';
import { ACCENTS, getPref, setPref, setCustomAccent } from '../core/theme.js';

const LINKS = {
  github: 'https://github.com/dev-kedas/KEDAS',
  saweria: 'https://saweria.co/KEDAS',
  trakteer: 'https://trakteer.id/kedass',
  kofi: 'https://ko-fi.com/KEDAS',
  sponsors: 'https://github.com/sponsors/dev-kedas',
};

const NAV_H = 68;
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const GH = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
const HEART = svg('<path d="M12 21s-7-4.6-9.3-9.1C1.3 8.9 3 5 6.6 5c2 0 3.4 1.1 5.4 3 2-1.9 3.4-3 5.4-3 3.6 0 5.3 3.9 3.9 6.9C19 16.4 12 21 12 21z"/>');
const COFFEE = svg('<path d="M4 8h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM16 10h2a2 2 0 010 4h-2M8 3v2M12 3v2"/>');
const STAR = svg('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>');
const BUG = svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>');
const FORK = svg('<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 003 3h6a3 3 0 003-3V7M12 12v5"/>');

const SUPPORT = [
  { k: 'saweria', name: 'Saweria', desc: 'Dukung lewat QRIS, e-wallet, atau transfer bank.', icon: HEART, c: '#f5a623' },
  { k: 'trakteer', name: 'Trakteer', desc: 'Traktir es kopi atau camilan buat developer.', icon: COFFEE, c: '#e0364f' },
  { k: 'kofi', name: 'Ko-fi', desc: 'Dukungan dari luar negeri, tanpa ribet.', icon: COFFEE, c: '#ff5e5b' },
  { k: 'sponsors', name: 'GitHub Sponsors', desc: 'Dukungan bulanan langsung lewat GitHub.', icon: GH, c: '#8250df' },
];
const MARQ = ['Saldo otomatis', 'Pengingat jatuh tempo', 'Bukti foto nota', 'Tema terang & gelap', 'Cadangan data', 'Akses anggota & admin', 'Gratis selamanya', 'Tanpa instalasi'];
const WORDS = ['rapi', 'transparan', 'tanpa drama', 'bebas ribet'];
const STEPS = [
  ['Buat organisasi', 'Isi nama organisasi, sistem iuran (mingguan atau bulanan), nominal, lalu daftar dengan email dan password admin.'],
  ['Bagikan kode', 'Tambahkan anggota, lalu bagikan kode organisasi atau QR-nya. Mereka tinggal pindai atau ketik kode untuk masuk.'],
  ['Catat & pantau', 'Catat pembayaran dan pengeluaran. Saldo dan tunggakan terhitung otomatis.'],
];
const FAQ = [
  ['Apakah ini gratis?', 'Ya. Tidak ada biaya dan tidak perlu menginstal apa pun, cukup buka di browser.'],
  ['Di mana datanya disimpan?', 'Di server, bukan di browser, jadi data tetap aman walau HP atau laptop diganti. Kamu tetap bisa mengekspor Excel dari menu Pengaturan untuk arsip sendiri.'],
  ['Bagaimana kalau ganti perangkat?', 'Tinggal masuk lagi. Admin masuk dengan email dan password, anggota dengan kode organisasi. Datanya otomatis sama di semua perangkat.'],
  ['Siapa yang bisa mengubah data?', 'Hanya admin (bendahara) yang masuk dengan email dan password. anggota hanya bisa melihat kas dan status iurannya sendiri.'],
  ['Apakah anggota bisa melihat kas organisasi?', 'Bisa. anggota yang masuk dengan kode organisasi bisa melihat saldo, pemasukan, pengeluaran, dan status iurannya sendiri.'],
  ['Bagaimana cara membagikan kode organisasi?', 'Buka Pengaturan, bagian Akses organisasi, lalu tekan Salin. Kode itulah yang dipakai anggota untuk masuk.'],
  ['Kode organisasi bocor, apa yang harus dilakukan?', 'Tekan Ganti di Pengaturan. Kode lama langsung tidak berlaku dan anggota harus memakai kode baru.'],
  ['Bagaimana kalau lupa password admin?', 'Di halaman masuk admin, pilih “Lupa password?”, lalu ikuti link yang dikirim ke emailmu. Password juga bisa diubah dari Pengaturan.'],
  ['Bagaimana mengatur iuran mingguan atau bulanan?', 'Di Pengaturan, bagian Sistem kas: pilih Mingguan atau Bulanan, isi nominal, dan tanggal mulai. Mengubahnya menghitung ulang semua status.'],
  ['Apakah ada pengingat sebelum jatuh tempo?', 'Ada. Atur jumlah hari pengingat di Pengaturan, lalu lihat notifikasinya lewat ikon lonceng.'],
  ['Apakah bisa dipakai di HP?', 'Bisa. Tampilannya menyesuaikan layar, dan di layar kecil menu dipindah ke bawah.'],
  ['Kalau saldo kas minus, apa yang terjadi?', 'Kartu saldo di Dashboard otomatis berubah merah dan memberi peringatan bahwa pengeluaran melebihi pemasukan.'],
];


const SCRUB = 'Iuran itu seharusnya tidak bikin pusing. Kas organisasi yang [{transparan}] berarti siapa sudah bayar, siapa belum, dan ke mana uang organisasi pergi [terlihat jelas] tanpa harus bertanya dua kali.';
const scrubHtml = s => s.split(/(\[[^\]]+\])/).filter(Boolean).flatMap(part => {
  const hl = part[0] === '[', t = hl ? part.slice(1, -1) : part;
  return t.split(' ').filter(Boolean).map(w => {
    const ac = /^\{[^}]+\}[.,]?$/.test(w), txt = ac ? w.replace(/[{}]/g, '') : w;
    return `<span class="w${hl ? ' hl' : ''}${ac ? ' ac' : ''}">${esc(txt)}</span>`;
  });
}).join(' ');
const splitWords = (t, base = 0) => t.split(' ').map((w, i) => `<span class="lp-mask"><span style="--i:${base + i}">${w}</span></span>`).join(' ');

const MARQ_HTML = [...MARQ, ...MARQ].map(t => `<span>${t}</span>`).join('');

const bars = [38, 52, 44, 66, 58, 74, 62, 82, 70, 90, 78, 96].map((h, i) => `<i style="--h:${h}%;--i:${i}"></i>`).join('');
const rows = [
  ['in', 'down', 'Pembayaran · Rina', 'Iuran minggu ke-3', '+Rp5.000'],
  ['out', 'up', 'Fotokopi materi', 'Fotokopi', '−Rp45.000'],
  ['in', 'down', 'Pembayaran · Dimas', 'Iuran minggu ke-3', '+Rp5.000'],
].map(([t, i, a, b, c], n) => `<div class="lp-m-row" style="--i:${n}"><span class="ico ${t}">${ic(i)}</span><div><b>${a}</b><small>${b}</small></div><em class="${t}">${c}</em></div>`).join('');

const QR_CODE = 'KAS-DEMO-XIPA';
const QR_ROWS = ["111111100110001111111", "100000101111101000001", "101110100001101011101", "101110100011001011101", "101110101110101011101", "100000100000101000001", "111111101010101111111", "000000000111100000000", "101010100011000010010", "101010001111001101010", "110100101110110111111", "100001010000010000001", "100110111000100101100", "000000001011001101010", "111111100101111111011", "100000100011000001000", "101110101110111110010", "101110100100011100110", "101110101011101111101", "100000100110000100010", "111111101100001110111"];
const QR_Q = 3, QR_SIZE = QR_ROWS.length + QR_Q * 2;
const QR_SVG = `<svg viewBox="0 0 ${QR_SIZE} ${QR_SIZE}" class="lp-qr" role="img" aria-label="QR kode organisasi ${QR_CODE}" shape-rendering="crispEdges">${QR_ROWS.map((row, r) => [...row].map((ch, c) => ch === '1' ? `<rect x="${c + QR_Q}" y="${r + QR_Q}" width="1.02" height="1.02" style="--d:${((r + c) * 0.016).toFixed(2)}s"/>` : '').join('')).join('')}</svg>`;
const QR_CHARS = [...QR_CODE].map((ch, i) => ch === '-' ? '<em>-</em>' : `<i style="--i:${i}">${ch}</i>`).join('');

const PANELS = [
  `<div class="lp-card-pn">
    <div class="lp-f"><small>Nama organisasi</small><b>XI IPA 2</b></div>
    <div class="lp-f"><small>Sistem iuran</small><b>Mingguan · Rp5.000</b></div>
    <div class="lp-f"><small>Email admin</small><b>kamu@email.com</b></div>
    <div class="lp-f ok">${ic('check')}organisasi siap dibuat</div>
  </div>`,
  `<div class="lp-card-pn lp-sharecard">
    <div class="lp-share-top"><small>Kode organisasi</small><span class="lp-live"><i></i>Aktif</span></div>
    <div class="lp-qr-tile">${QR_SVG}<span class="lp-qr-scan" aria-hidden="true"></span></div>
    <div class="lp-code" role="text" aria-label="Kode organisasi ${QR_CODE}">${QR_CHARS}</div>
    <button type="button" class="btn lp-copy" data-lpcopy="${QR_CODE}">${ic('copy')}<span>Salin kode</span></button>
    <p class="lp-share-hint">anggota tinggal pindai QR atau ketik kode ini untuk masuk.</p>
  </div>`,
  `<div class="lp-card-pn lp-ringcard">
    <div class="lp-ring-wrap">
      <svg viewBox="0 0 140 140" class="lp-ring" aria-hidden="true"><circle cx="70" cy="70" r="54" class="rg-t" transform="rotate(-90 70 70)"/><circle cx="70" cy="70" r="54" class="rg-f" transform="rotate(-90 70 70)" style="stroke-dashoffset:339.29"/></svg>
      <div class="lp-ring-c"><b>0%</b><small>iuran terkumpul</small></div>
    </div>
    <div class="lp-ring-row"><div><small>Terkumpul</small><b>Rp1.250.000</b></div><div><small>Target</small><b>Rp1.525.000</b></div></div>
  </div>`,
];

const SALDO = [180, 290, 410, 370, 520, 640, 600, 780, 880, 830, 1060, 1250];
const SMIN = Math.min(...SALDO), SMAX = Math.max(...SALDO);
const SPTS = SALDO.map((v, i) => [i * 300 / (SALDO.length - 1), 106 - (v - SMIN) / (SMAX - SMIN) * 92]);
function smoothPath(pts) {
  const n = pts.length, dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${(pts[i][0] + h).toFixed(1)} ${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)} ${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`; }
  return d;
}
const SPARK_LINE = smoothPath(SPTS);
const SPARK_AREA = SPARK_LINE + ' L300 120 L0 120Z';
const SPARK_DOTS = SPTS.map(([x, y], i) => `<span class="lp-sp-pt${i < 2 ? ' el' : ''}${i >= SPTS.length - 2 ? ' er' : ''}${i === SPTS.length - 1 ? ' last' : ''}" style="left:${(x / 3).toFixed(2)}%;top:${(y / 1.2).toFixed(2)}%;--i:${i}" data-t="Minggu ${i + 1} · Rp${fmtNum(SALDO[i] * 1000)}"></span>`).join('');
const SPARK_GRID = [11.7, 37.2, 62.8, 88.3].map(t => `<i class="lp-sp-grid" style="top:${t}%"></i>`).join('');

const storyHtml = `<section class="lp-story-track" id="cara"><div class="lp-story"><div class="lp-story-in">
  <div class="lp-story-txt">
    <div class="lp-head-s"><span>Cara kerja</span><h2>Tiga langkah, langsung jalan</h2></div>
    <div class="lp-sp"><i></i></div>
    ${STEPS.map(([t, d], n) => `<div class="lp-st" data-st="${n}"><i>${n + 1}</i><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
  </div>
  <div class="lp-panels">${PANELS.map((p, n) => `<div class="lp-pn" data-pn="${n}">${p}</div>`).join('')}</div>
</div></div></section>`;

const SUPPORT_CARDS = SUPPORT.filter(s => LINKS[s.k]).map(s => `<a class="lp-sup lp-rv" style="--sc:${s.c}" href="${esc(LINKS[s.k])}" target="_blank" rel="noopener noreferrer"><span class="lp-sup-ico">${s.icon}</span><div><b>${s.name}</b><small>${s.desc}</small></div>${ic('arrow')}</a>`).join('');
const REPO_BTNS = LINKS.github ? `<div class="lp-repo lp-rv">
  <div class="lp-repo-txt"><span class="lp-repo-ico">${GH}</span><div><b>Open source di GitHub</b><small>Kasih bintang, laporkan bug, atau ikut berkontribusi. Semua bantuan sangat berarti.</small></div></div>
  <div class="lp-repo-btns">
    <a class="btn" href="${esc(LINKS.github)}" target="_blank" rel="noopener noreferrer">${STAR}Beri bintang</a>
    <a class="btn" href="${esc(LINKS.github)}/issues/new" target="_blank" rel="noopener noreferrer">${BUG}Lapor bug</a>
    <a class="btn" href="${esc(LINKS.github)}/fork" target="_blank" rel="noopener noreferrer">${FORK}Fork</a>
  </div></div>` : '';

const swatches = () => {
  const cur = getPref().accent, c = ACCENTS.custom;
  const preset = Object.entries(ACCENTS).filter(([k]) => k !== 'custom').map(([k, a]) => `<button type="button" class="lp-sw ${cur === k ? 'on' : ''}" style="--c:${a.c};--c2:${a.c2}" data-accent="${k}" aria-label="Warna ${a.name}" title="${a.name}">${ic('check')}</button>`).join('');
  const custom = `<label class="lp-sw lp-sw-custom ${cur === 'custom' ? 'on' : ''}" style="--c:${c.c};--c2:${c.c2}" title="Warna kustom" aria-label="Pilih warna kustom">${ic('check')}${ic('plus')}<input id="lpColor" type="color" value="${c.c}"></label>`;
  return preset + custom;
};

const HTML = () => `
<header class="lp-nav"><div class="lp-wrap">
  <div class="lp-brand"><div class="brand-mark is-img"><img src="/logo.svg" alt="" width="38" height="38"></div>KEDAS</div>
  <nav class="lp-links" aria-label="Navigasi beranda">
    <a href="#fitur" data-scroll="fitur">Fitur</a><a href="#hitung" data-scroll="hitung">Simulasi</a><a href="#cara" data-scroll="cara">Cara kerja</a><a href="#dukung" data-scroll="dukung">Dukung</a><a href="#faq" data-scroll="faq">FAQ</a>
  </nav>
  <div class="lp-cta">
    <button class="icon-btn lp-mode" data-mode aria-label="Ganti mode terang/gelap"><span class="m-sun">${ic('sun')}</span><span class="m-moon">${ic('moon')}</span></button>
    <button class="btn ghost" data-open="code">Masuk</button><button class="btn primary lp-hide-s lp-mag" data-open="create">Buat organisasi</button>
  </div>
</div></header>

<section class="lp-hero">
  <div class="lp-bg" aria-hidden="true"><span class="lp-blob b1"></span><span class="lp-blob b2"></span><span class="lp-blob b3"></span><span class="lp-gridbg"></span><span class="lp-spot"></span></div>
  <div class="lp-wrap lp-hero-in">
    <div class="lp-copy">
      <span class="lp-badge lp-rv"><i>${ic('check')}</i>Transparan untuk semua · Gratis</span>
      <h1 class="lp-rv" style="--d:.06s" aria-label="Kas organisasi yang rapi, transparan, tanpa drama, bebas ribet">${splitWords('Kas organisasi yang', 0)} <span class="lp-rot" aria-hidden="true"><span class="lp-rot-rv" style="--i:3"><span class="lp-rot-in">${[...WORDS, WORDS[0]].map(w => `<b>${w}</b>`).join('')}</span></span></span></h1>
      <p class="lp-rv" style="--d:.12s">Catat iuran, pantau tunggakan, dan tunjukkan ke mana uang organisasi pergi. Semua anggota bisa melihat, bendahara tinggal mencatat.</p>
      <div class="lp-actions lp-rv" style="--d:.18s">
        <button class="btn primary lp-big lp-mag" data-open="create">Mulai sekarang${ic('arrow')}</button>
        <button class="btn lp-big" data-open="code">Sudah punya organisasi? Masuk</button>
      </div>
      <small class="lp-note lp-rv" style="--d:.24s">Tanpa instalasi · data tersimpan di server</small>
    </div>
    <div class="lp-stage lp-rv" style="--d:.12s" aria-hidden="true">
      <div class="lp-mock">
        <div class="lp-m-bar"><i></i><i></i><i></i><span>Kas Organisasi · XI IPA 2</span></div>
        <div class="lp-m-hero"><small>Saldo kas saat ini</small><b><span>Rp</span><em data-count="1250000">1.250.000</em></b><div class="lp-m-spark">${bars}</div></div>
        <div class="lp-m-stats"><div class="in"><small>Pemasukan</small><b>Rp1.600.000</b></div><div class="out"><small>Pengeluaran</small><b>Rp350.000</b></div></div>
        ${rows}
      </div>
      <div class="lp-fl f1" style="--z:34"><span class="lp-float">${ic('check')}Lunas</span></div>
      <div class="lp-fl f2" style="--z:-26"><span class="lp-float">${ic('bell')}2 pengingat</span></div>
      <div class="lp-fl f3" style="--z:18"><span class="lp-float">${ic('receipt')}Nota tersimpan</span></div>
    </div>
  </div>
</section>

<div class="lp-marq" aria-hidden="true"><div class="lp-track">${MARQ_HTML}</div></div>

<section class="lp-scrub" aria-label="Pengantar"><div class="lp-wrap">
  <div class="lp-scrub-in">
    <article class="lp-spark-card lp-rv">
      <div class="lp-sp-top"><div class="l"><small>Tren saldo organisasi</small><b>Rp${fmtNum(SALDO[SALDO.length - 1] * 1000)}</b></div><span class="lp-sp-rng">12 minggu</span></div>
      <div class="lp-sp-chart">
        ${SPARK_GRID}
        <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="spG" x1="0" y1="0" x2="0" y2="1"><stop class="ga" offset="0"/><stop class="gb" offset="1"/></linearGradient></defs>
          <path class="sp-area" d="${SPARK_AREA}" fill="url(#spG)"/>
          <path class="sp-line" pathLength="1" d="${SPARK_LINE}"/>
        </svg>
        ${SPARK_DOTS}
      </div>
      <div class="lp-sp-axis"><span>Minggu 1</span><span>Sekarang</span></div>
    </article>
    <p>${scrubHtml(SCRUB)}</p>
  </div>
</div></section>

<section class="lp-sec" id="fitur"><div class="lp-wrap">
  <div class="lp-head lp-rv"><span>Fitur</span><h2>Semua yang dibutuhkan bendahara</h2><p>Dibuat sederhana supaya mencatat kas tidak lagi jadi pekerjaan yang melelahkan.</p></div>
  <div class="lp-bento">
    <article class="lp-b w3 lp-rv"><span class="lp-ico">${ic('wallet')}</span><h3>Saldo selalu jelas</h3><p>Pemasukan, pengeluaran, dan saldo dihitung otomatis. Kalau kas minus, kartu saldo langsung berubah merah.</p><div class="lp-neg"><span>Rp1.250.000</span><span class="bad">−Rp80.000</span></div></article>
    <article class="lp-b w3 lp-rv" style="--d:.06s"><span class="lp-ico">${ic('clock')}</span><h3>Pengingat jatuh tempo</h3><p>anggota yang hampir jatuh tempo atau menunggak langsung muncul di notifikasi, jadi tidak perlu menagih satu per satu.</p><div class="lp-pills"><span class="pill lunas">Lunas</span><span class="pill belum">Belum Bayar</span><span class="pill tunggak">Menunggak</span></div></article>
    <article class="lp-b w2 lp-rv"><span class="lp-ico">${ic('receipt')}</span><h3>Bukti pengeluaran</h3><p>Lampirkan foto nota supaya setiap pengeluaran bisa dipertanggungjawabkan.</p></article>
    <article class="lp-b w2 lp-rv" style="--d:.06s"><span class="lp-ico">${ic('users')}</span><h3>anggota &amp; admin</h3><p>Semua anggota bisa melihat kondisi kas. Hanya bendahara yang bisa mencatat.</p></article>
    <article class="lp-b w2 lp-rv" style="--d:.12s"><span class="lp-ico">${ic('sun')}</span><h3>Tema sesuai selera</h3><p>Klik warnanya, atau pilih warna sendiri dengan kotak pelangi:</p><div class="lp-sws" id="lpSws">${swatches()}</div></article>
  </div>
</div></section>

<section class="lp-sec alt" id="hitung"><div class="lp-wrap">
  <div class="lp-head lp-rv"><span>Simulasi</span><h2>Berapa kas organisasimu nanti?</h2><p>Geser angkanya atau ketik sendiri. Hasilnya langsung berubah.</p></div>
  <div class="lp-calc lp-rv">
    <div class="lp-calc-in">
      <div class="lp-row-h"><label for="nN">Jumlah anggota</label><input class="lp-num" type="number" id="nN" min="1" step="1" value="32" inputmode="numeric"></div>
      <input type="range" id="rN" min="1" max="100" step="1" value="32" aria-label="Jumlah anggota">
      <div class="lp-row-h"><label for="nNom">Iuran per periode</label><span class="lp-num-w"><span>Rp</span><input class="lp-num" id="nNom" type="text" data-money="1" value="5.000" inputmode="numeric" autocomplete="off"></span></div>
      <input type="range" id="rNom" min="1000" max="100000" step="1000" value="5000" aria-label="Iuran per periode">
      <label>Sistem iuran</label>
      <div class="lp-tog" id="lpTog" data-v="0"><button type="button" data-per="weekly" class="on">Mingguan</button><button type="button" data-per="monthly">Bulanan</button></div>
      <p class="hint">Geser naik per Rp1.000. Mau lebih dari 100 anggota atau Rp100.000? Ketik langsung, titik ribuan terisi otomatis.</p>
    </div>
    <div class="lp-calc-out">
      <small>Kas terkumpul per bulan</small><b class="lp-big-n"><span>Rp</span><em id="oMonth">640.000</em></b>
      <small>Perkiraan satu tahun (12 bulan)</small><b class="lp-big-n sm"><span>Rp</span><em id="oYear">7.680.000</em></b>
      <p id="oNote">Mingguan: 1 bulan = 4 iuran. Semua anggota membayar penuh.</p>
    </div>
  </div>
</div></section>

${storyHtml}

<section class="lp-sec alt" id="dukung"><div class="lp-wrap">
  <div class="lp-head lp-rv"><span class="lp-heart">${HEART}Dukung kami</span><h2>Gratis, dibuat dengan sepenuh hati</h2><p>Kas Organisasi gratis dan dikerjakan di waktu luang. Kalau terasa membantu, dukunganmu bikin proyek ini terus hidup.</p></div>
  ${SUPPORT_CARDS ? `<div class="lp-sups">${SUPPORT_CARDS}</div>` : ''}
  ${REPO_BTNS}
</div></section>

<section class="lp-sec" id="faq"><div class="lp-wrap lp-narrow">
  <div class="lp-head lp-rv"><span>FAQ</span><h2>Pertanyaan yang sering muncul</h2></div>
  ${FAQ.map(([q, a], n) => `<details class="lp-faq lp-rv" style="--d:${Math.min(n, 6) * 0.06}s"><summary>${q}${ic('arrow')}</summary><div class="lp-faq-a"><p>${a}</p></div></details>`).join('')}
</div></section>

<section class="lp-sec" style="padding-top:0"><div class="lp-wrap"><div class="lp-final lp-rv">
  <h2>Siap merapikan kas organisasimu?</h2><p>Buat organisasi dalam satu menit, lalu bagikan kodenya ke teman seorganisasi.</p>
  <div class="lp-actions"><button class="btn lp-big lp-light lp-mag" data-open="create">Buat organisasi baru</button><button class="btn lp-big lp-ghost" data-open="code">Masuk</button></div>
</div></div></section>

<footer class="lp-foot"><div class="lp-wrap">
  <div class="lp-brand"><div class="brand-mark is-img"><img src="/logo.svg" alt="" width="38" height="38"></div>KEDAS</div>
  <div class="lp-flinks"><a href="#fitur" data-scroll="fitur">Fitur</a><a href="#dukung" data-scroll="dukung">Dukung</a>${LINKS.github ? `<a href="${esc(LINKS.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}</div>
   <small>© ${new Date().getFullYear()} KEDAS. Hak cipta dilindungi. Kode sumber hanya untuk dilihat, dilarang disalin atau didistribusikan ulang tanpa izin tertulis.</small>
</div></footer>`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function tween(el, to, ms = 700) {
  cancelAnimationFrame(el._raf);
  const from = el._v || 0, t0 = performance.now(); el._v = to;
  if (reduced()) { el.textContent = fmtNum(to); return; }
  (function f(t) {
    const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmtNum(from + (to - from) * e);
    if (p < 1) el._raf = requestAnimationFrame(f);
  })(t0);
}

const sim = { weekly: true };
const numOf = (el, min) => { const v = parseFloat(String(el.value).replace(',', '.')); return Number.isFinite(v) && v >= min ? v : min; };
function calc(animate = true) {
  const n = numOf($('#nN'), 1), nom = Math.max(1, parseMoney($('#nNom').value));
  $('#rN').value = clamp(n, 1, 100);
  $('#rNom').value = clamp(nom, 1000, 100000);
  [$('#rN'), $('#rNom')].forEach(r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'));
  const month = n * nom * (sim.weekly ? 4 : 1), year = month * 12;
  $('#oNote').textContent = sim.weekly ? 'Mingguan: 1 bulan = 4 iuran. Semua anggota membayar penuh.' : 'Bulanan: 1 bulan = 1 iuran. Semua anggota membayar penuh.';
  if (animate) { tween($('#oMonth'), month); tween($('#oYear'), year); }
  else { $('#oMonth').textContent = fmtNum(month); $('#oYear').textContent = fmtNum(year); $('#oMonth')._v = month; $('#oYear')._v = year; }
}

let rootEl = null, raf = 0, lastK = -1, shown = -9;
const RING_C = 2 * Math.PI * 54;
function ringTo(on) {
  const st = rootEl && rootEl.querySelector('.lp-story-track');
  const f = st && st.querySelector('.rg-f'), num = st && st.querySelector('.lp-ring-c b');
  if (!f || !num) return;
  cancelAnimationFrame(f._raf);
  const fromOff = f._off ?? RING_C, toOff = on ? RING_C * (1 - 0.82) : RING_C;
  const fromP = f._p ?? 0, toP = on ? 82 : 0;
  const dur = reduced() ? 0 : on ? 1700 : 450, t0 = performance.now();
  const ease = x => 1 - Math.pow(1 - x, 4);
  (function step(t) {
    const p = dur ? Math.min(1, (t - t0) / dur) : 1, e = ease(p);
    f._off = fromOff + (toOff - fromOff) * e; f._p = fromP + (toP - fromP) * e;
    f.style.strokeDashoffset = f._off.toFixed(2);
    num.textContent = Math.round(f._p) + '%';
    if (p < 1) f._raf = requestAnimationFrame(step);
  })(t0);
}
const sm = { sy: 0, scrub: 0, story: 0 };
const isMobile = () => matchMedia('(max-width: 900px)').matches;
function paintStory(all) {
  const st = rootEl && rootEl.querySelector('.lp-story-track'); if (!st) return;
  st.querySelectorAll('.lp-st').forEach((el, i) => el.classList.toggle('on', all || i === shown));
  st.querySelectorAll('.lp-pn').forEach((el, i) => el.classList.toggle('on', all || i === shown));
  ringTo(all || shown === 2);
}
function frame() {
  raf = 0;
  if (!rootEl || !document.body.classList.contains('is-auth')) return;
  const vh = innerHeight;
  let moving = false;

  sm.sy += (scrollY - sm.sy) * 0.14;
  if (Math.abs(scrollY - sm.sy) > 0.3) moving = true;
  rootEl.style.setProperty('--sy', sm.sy.toFixed(1));
  const nav = rootEl.querySelector('.lp-nav'); if (nav) nav.classList.toggle('stuck', scrollY > 8);

  const sc = rootEl.querySelector('.lp-scrub');
  if (sc) {
    const r = sc.getBoundingClientRect();
    const tgt = clamp((vh * 0.9 - r.top) / (vh * 0.8));
    sm.scrub += (tgt - sm.scrub) * 0.12;
    if (Math.abs(tgt - sm.scrub) > 0.002) moving = true;
    const ws = sc.querySelectorAll('.w'), k = Math.round(sm.scrub * ws.length);
    if (k !== lastK) { lastK = k; ws.forEach((w, i) => w.classList.toggle('on', i < k)); }
  }

  const st = rootEl.querySelector('.lp-story-track');
  if (st) {
    const r = st.getBoundingClientRect(), range = st.offsetHeight - (vh - NAV_H);
    const tgt = range > 0 ? clamp((NAV_H - r.top) / range) : 0;
    sm.story += (tgt - sm.story) * 0.12;
    if (Math.abs(tgt - sm.story) > 0.002) moving = true;
    st.style.setProperty('--sp', sm.story.toFixed(3));
    const idx = Math.min(STEPS.length - 1, Math.floor(sm.story * STEPS.length * 0.999));
    if (idx !== shown) { shown = idx; paintStory(false); }
  }
  if (moving) raf = requestAnimationFrame(frame);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
const onScroll = kick;
function resetStory() { shown = -9; lastK = -1; sm.story = 0; sm.scrub = 0; }

let io;
export function renderLanding() {
  $('#landing').innerHTML = HTML();
  rootEl = $('#landing');
  window.scrollTo(0, 0);
  calc(false);
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    x.target.classList.add('in'); io.unobserve(x.target);
    x.target.querySelectorAll('[data-count]').forEach(el => tween(el, +el.dataset.count, 1500));
  }), { threshold: 0.12 });
  document.querySelectorAll('#landing .lp-rv').forEach(el => io.observe(el));
  resetStory();
  kick();
}

const FAQ_EASE = 'cubic-bezier(.22,.7,.2,1)';
function faqToggle(d) {
  const body = d.querySelector('.lp-faq-a');
  if (reduced()) { d.open = !d.open; d.classList.toggle('open', d.open); return; }
  if (d._busy) return;
  d._busy = true;
  if (!d.open) {
    d.open = true; d.classList.add('open');
    const h = body.scrollHeight;
    const a = body.animate([{ height: '0px', opacity: 0, transform: 'translateY(-6px)' }, { height: h + 'px', opacity: 1, transform: 'none' }], { duration: 460, easing: FAQ_EASE });
    a.onfinish = () => { d._busy = false; };
  } else {
    d.classList.remove('open');
    const h = body.offsetHeight;
    const a = body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 340, easing: FAQ_EASE });
    a.onfinish = () => { d.open = false; d._busy = false; };
  }
}

async function copyCode(btn) {
  try { await navigator.clipboard.writeText(btn.dataset.lpcopy); } catch { }
  const s = btn.querySelector('span'); btn.classList.add('done'); s.textContent = 'Tersalin';
  clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove('done'); s.textContent = 'Salin kode'; }, 1800);
}

export function initLanding({ onOpen }) {
  const root = $('#landing');
  root.addEventListener('click', e => {
    const fq = e.target.closest('.lp-faq > summary');
    if (fq) { e.preventDefault(); faqToggle(fq.parentElement); return; }
    const cp = e.target.closest('[data-lpcopy]'); if (cp) { copyCode(cp); return; }
    const o = e.target.closest('[data-open]'); if (o) return onOpen(o.dataset.open, e);
    const s = e.target.closest('[data-scroll]');
    if (s) { e.preventDefault(); const t = document.getElementById(s.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth' }); return; }
    if (e.target.closest('.lp-mode')) { setPref({ mode: document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark' }); return; }
    const a = e.target.closest('[data-accent]');
    if (a) { setPref({ accent: a.dataset.accent }); document.querySelectorAll('#lpSws .lp-sw').forEach(b => b.classList.toggle('on', b === a)); return; }
    const p = e.target.closest('[data-per]');
    if (p) { sim.weekly = p.dataset.per === 'weekly'; $('#lpTog').dataset.v = sim.weekly ? 0 : 1; $('#lpTog').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === p)); calc(); }
  });
  root.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'rN') $('#nN').value = t.value;
    else if (t.id === 'rNom') $('#nNom').value = fmtNum(t.value);
    else if (!t.matches('#nN,#nNom')) return;
    calc(false);
  });

  root.addEventListener('pointermove', e => {
    const h = e.target.closest('.lp-hero');
    if (h) {
      const r = h.getBoundingClientRect();
      h.style.setProperty('--mx', (e.clientX - r.left) + 'px'); h.style.setProperty('--my', (e.clientY - r.top) + 'px');
      h.style.setProperty('--px', ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3)); h.style.setProperty('--py', ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
    }
    const c = e.target.closest('.lp-b');
    if (c && !reduced()) {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--x', (x * r.width) + 'px'); c.style.setProperty('--y', (y * r.height) + 'px');
      c.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 6).toFixed(2)}deg) rotateY(${((x - 0.5) * 8).toFixed(2)}deg) translateY(-3px)`;
    }
    const m = e.target.closest('.lp-mag');
    if (m && !reduced()) { const r = m.getBoundingClientRect(); m.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)}px,${((e.clientY - r.top - r.height / 2) * 0.26).toFixed(1)}px)`; }
  });
  root.addEventListener('pointerout', e => {
    const m = e.target.closest('.lp-mag'); if (m && !m.contains(e.relatedTarget)) m.style.transform = '';
    const c = e.target.closest('.lp-b'); if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
  });
  root.addEventListener('input', e => {
    if (e.target.id === 'lpColor') { const s = document.documentElement.style; s.setProperty('--brand', e.target.value); s.setProperty('--brand-2', e.target.value); }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'lpColor') return;
    setCustomAccent(e.target.value);
    document.querySelectorAll('#lpSws .lp-sw').forEach(b => b.classList.toggle('on', b.classList.contains('lp-sw-custom')));
    const cu = document.querySelector('#lpSws .lp-sw-custom'); if (cu) { cu.style.setProperty('--c', e.target.value); cu.style.setProperty('--c2', e.target.value); }
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}