# AHASS Digital Performance Dashboard

Dashboard statis untuk GitHub Pages yang terhubung ke CSV Google Sheets yang dipublikasikan.

## File
- `index.html` — struktur halaman dashboard
- `style.css` — tampilan tema terang korporat
- `script.js` — pemuatan CSV, perhitungan KPI, filter, grafik, peringkat, dan prioritas tindak lanjut

## Publikasi di GitHub Pages
1. Ekstrak ZIP.
2. Buka repositori GitHub dashboard.
3. Unggah/ganti `index.html`, `style.css`, dan `script.js` di root repositori.
4. Commit perubahan.
5. Buka URL GitHub Pages dan muat ulang dengan `Ctrl + F5`.

## Sumber data
Dashboard mengambil data dari URL CSV Google Sheets di `script.js` dan memperbarui otomatis setiap lima menit. Parser mengharapkan struktur laporan ekspor Oktober 2026.

## Catatan keamanan
CSV yang dipublikasikan dapat dibaca publik. Pastikan data yang ditampilkan memang diizinkan untuk diakses publik.


## Ekspor laporan JPEG
Klik tombol **Ekspor JPEG** di kanan atas dashboard. Gambar akan mengikuti filter Kota, Grup, Status Channel, dan AHASS yang sedang aktif. Untuk laporan yang paling mudah dibaca di WhatsApp, gunakan halaman Ringkasan dan pilih filter yang sesuai sebelum mengekspor. Fitur ini menggunakan html2canvas dari CDN sehingga membutuhkan koneksi internet saat dashboard dibuka.
