# Performance Digital AHASS Astra Motor Sumsel — Oktober & November 2026

## Isi paket
- `index.html` — halaman dashboard
- `style.css` — tampilan corporate light dan responsive
- `script.js` — koneksi Google Sheets CSV, filter, visualisasi, ranking, prioritas, dan ekspor JPEG

## Cara upload ke GitHub Pages
1. Download dan ekstrak ZIP ini.
2. Buka repository GitHub dashboard yang sekarang digunakan.
3. Upload/replace ketiga file (`index.html`, `style.css`, `script.js`) pada folder utama repository. Pastikan nama file persis sama.
4. Commit changes, lalu tunggu GitHub Pages selesai deploy.
5. Buka website dan pilih periode Oktober 2026 atau November 2026.

## Sumber data
Dashboard membaca dua tab dari satu Google Sheets yang dipublikasikan sebagai CSV:
- Oktober 2026: `gid=607615076`
- November 2026: `gid=1286174024`

Auto-refresh berjalan setiap 5 menit. Tombol Refresh dapat digunakan untuk mengambil data terbaru secara manual. Tab November saat ini dapat menampilkan actual 0 dan akan membaca nilai baru setelah tab Google Sheets diperbarui.

## Catatan struktur data
Parser menggunakan struktur kolom workbook saat ini: Kota (D), Grup (B), Status (E), Kode AHASS (F), Nama AHASS (H), Target KPB (J), Total KPB Digital (M), Target/Actual Booking (O/P), dan Target/Actual AstraPay (R/S). Jika posisi kolom pada Google Sheets diubah, pemetaan di `script.js` harus disesuaikan.

## Fitur
- Pilihan periode Oktober/November 2026.
- Filter cascading Kota, Grup Dealer, Status Channel, dan AHASS.
- Ringkasan KPI, analisis channel, peringkat AHASS, dan prioritas tindak lanjut.
- Nilai achievement disertai aktual dan target.
- Kriteria warna: KPB Digital merah <80%, kuning 80–<90%, hijau >=90%; Booking dan AstraPay merah <70%, kuning 70–<90%, hijau >=90%.
- Ekspor resume dan daftar AHASS menjadi satu gambar JPEG landscape. Ekspor mengikuti filter aktif dan tidak menyertakan grafik.

Dashboard menggunakan CDN untuk PapaParse, Chart.js, dan html2canvas sehingga koneksi internet diperlukan saat membuka dashboard.
