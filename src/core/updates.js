// Kabar BAWAAN dari KEDAS (tab "KEDAS" di panel notifikasi).
// Kabar baru sekarang dikirim lewat `npm run kedas:update` (tanpa deploy), lihat README.
// Isi file ini tetap tampil sebagai arsip; pesan dari database dengan id sama menang.
// Aturan nulis: satu entri = satu rilis (kumpulan perubahan), BUKAN satu commit.
// Tulis hanya yang terasa oleh pengguna: fitur baru atau perbaikan yang kelihatan.
// Refactor, ganti warna kecil, dan benerin typo tidak perlu diumumkan.
// tag: 'baru' (fitur) | 'perbaikan' (bug yang sempat mengganggu) | 'info' (kabar lain)
// Urutan di array bebas, panel mengurutkan dari yang terbaru. `id` harus unik dan jangan diubah
// setelah dirilis, karena dipakai buat status "sudah dibaca".
export const UPDATES = [
  {
    id: '2026-11-11b',
    ts: Date.parse('2026-11-11T14:00:00+07:00'),
    tag: 'baru',
    title: 'Notifikasi dipisah jadi dua tab',
    items: [
      'Tab Organisasi: pengumuman dari admin dan pengingat iuran.',
      'Tab KEDAS: semua kabar pembaruan aplikasi ada di sini.',
    ],
  },
  {
    id: '2026-11-11',
    ts: Date.parse('2026-11-11T08:00:00+07:00'),
    tag: 'baru',
    title: 'Pembaruan KEDAS',
    items: [
      'Halaman Pembayaran: ada kartu Belum Bayar, filter Belum bayar, dan penjelasan arti Lunas, Belum Bayar, Menunggak.',
      'Masuk sebagai anggota: pilih nama dari daftar atau ketik untuk mencari.',
      'Tablet dan HP lipat: sidebar tidak lagi menutupi konten dan tampilan beranda dirapikan.',
    ],
  },
];
