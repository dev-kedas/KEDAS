<div align="center">

# 💰 KEDAS

**Kas organisasi yang rapi, transparan, dan bisa diakses dari mana saja.**

Catat iuran, pantau pengeluaran, dan lihat siapa yang menunggak, semua dalam satu aplikasi.

</div>

---

## ✨ Kenapa KEDAS?

- **Real-time.** Perubahan langsung terlihat di semua perangkat.
- **Transparan.** anggota bisa melihat saldo dan status pembayaran sendiri.
- **Tanpa ribet.** anggota masuk cukup dengan kode organisasi, tanpa didaftarkan satu per satu.
- **Ada bukti.** Setiap pengeluaran bisa dilampiri foto struk atau nota.

## 🧭 Fitur

| Menu | Yang bisa dilakukan |
|---|---|
| 📊 **Dashboard** | Lihat saldo, total pemasukan dan pengeluaran, serta daftar anggota yang menunggak |
| 💵 **Pembayaran** | Catat setoran per anggota, lengkap dengan tanggal dan catatan |
| 🧾 **Pengeluaran** | Catat pengeluaran beserta kategori, catatan, dan foto bukti |
| 🔔 **Notifikasi** | Pengingat untuk hal penting, seperti tunggakan |
| 🔑 **Gabung cepat** | Bagikan kode organisasi atau QR, anggota tinggal pilih namanya |
| 💾 **Backup** | Ekspor seluruh data ke Excel, dan muat ulang kapan saja |
| 🎨 **Tema** | Mode terang, gelap, atau sistem, dengan warna aksen sendiri |

## 👥 Dua peran

| | 🛡️ Admin | 🎓 anggota |
|---|---|---|
| Cara masuk | Email dan password | Kode organisasi, lalu pilih nama |
| Mengelola data | ✅ Ya | ❌ Hanya melihat |
| Jumlah | 1 akun = 1 organisasi | Tak terbatas |

## 🚀 Cara mulai

1. **Admin** membuat organisasi dan menambahkan daftar anggota.
2. **Admin** membagikan kode atau QR organisasi.
3. **anggota** masuk dengan kode, lalu memilih namanya.
4. **Admin** mencatat pembayaran dan pengeluaran. anggota langsung melihat perubahannya.

---

<div align="center">

Dibuat dengan ❤️ untuk organisasi yang ingin kasnya lebih jelas.

</div>

## 🔗 Bagikan link & 🔔 Notifikasi HP (baru)

**Bagikan link.** Di Dashboard, admin tekan **Bagikan link**, pilih bagian (Dashboard, Saldo, Pemasukan, Pengeluaran, Tunggakan), lalu salin atau bagikan.
Link berbentuk `https://domain-kamu/s/saldo/KAS-XXXX-XXXX`. Di WhatsApp/Telegram link tampil dengan gambar pratinjau (tanpa angka kas).
Saat diklik: siswa yang belum masuk diminta memilih namanya dulu, lalu langsung dibawa ke dashboard dan bagian yang dibagikan disorot.

**Kirim notifikasi.** Di Dashboard, admin tekan **Kirim notifikasi**, isi judul dan pesan (atau pakai template), pilih semua siswa atau yang menunggak.
Pesan masuk ke notifikasi HP (bar notifikasi sistem) siswa yang sudah mengaktifkan notifikasi, dan juga ke lonceng di aplikasi.
Siswa mengaktifkannya dari banner di Dashboard atau Pengaturan › Pengguna › Notifikasi HP. Di iPhone, KEDAS harus ditambahkan ke Layar Utama dulu.

### Pasang sekali
1. Supabase > SQL Editor: jalankan `schema_update2.sql`.
2. Terminal (Supabase CLI sudah login dan terhubung ke project):
   ```
   supabase secrets set --env-file push-secrets.env
   supabase functions deploy send-push --no-verify-jwt
   ```
3. Deploy ke Vercel atau Netlify (fungsi pratinjau link ada di `api/share.js` dan `netlify/functions/share.mjs`).
   Variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` harus ada di pengaturan hosting.

`push-secrets.env` berisi kunci privat, jangan di-commit.
