# Pintu Masuk Bukan Destinasi: Webstory Wisatawan Mancanegara

UAS Visualisasi Data dan Informasi (K203407), Politeknik Statistika STIS. Take-home individu.
Penulis: Luthfia Nurul Izza (NIM 222313179).

- Webstory (GitHub Pages): `https://fizzz96.github.io/UAS-Visdat-222313179-LuthfiaNurulIzza/` (Settings, Pages, branch main, folder root, lalu uji tautannya)
- Repo: https://github.com/fizzz96/UAS-Visdat-222313179-LuthfiaNurulIzza

## Struktur berkas

```
index.html        kerangka halaman (hero memakai gambar lanskap dan pesawat di assets/, plus bagian Kesimpulan)
style.css         tema tiket dan kartu pos
app.js            semua grafik dan scrollytelling (D3 v7, d3-sankey, d3-cloud lewat cdnjs)
assets/flags/     bendera negara asal (flag-icons, lisensi MIT)
data/             JSON olahan, koordinat_negara_asal.csv, dunia_110m.geojson, sumber_brs.csv
skrip/            skrip pra-proses teks (tidak berubah)
```

## Tiga topik

| Topik | Visual | Data |
|---|---|---|
| Aliran | Peta busur negara asal ke pintu masuk, Sankey yang berubah halus (morph) dengan drill-down kawasan ke negara, matriks asal-tujuan (jumlah dan pangsa) | Kunjungan wisman 2024 menurut kebangsaan dan pintu masuk (total 13.902.420) |
| Hierarki | Treemap dan icicle, breadcrumb, dua urutan hierarki (wilayah, provinsi, sektor atau sebaliknya). Ukuran = PDRB ADHK 2024, warna = pertumbuhan riil 2023 ke 2024 | PDRB 38 provinsi menurut 17 lapangan usaha |
| Teks | Frekuensi kata, kata khas per periode, awan kata, tren kata per bulan, jaringan bigram. Filter periode, ukuran, dan pencarian kata | 127 BRS pariwisata BPS (Nov 2015 sampai Agu 2026 menurut bulan data) |

Pelengkap: tren wisman bulanan 2019-2025 (linimasa dan tumpukan per tahun).

## Scrollytelling dan interaksi

Setiap modul memiliki panggung grafik yang menempel (sticky) dan kartu pos langkah di sampingnya. Teks tiap langkah dihitung dari data, bukan ditulis tangan. Panggung memakai tinggi layar dikurangi bilah navigasi, sehingga diagram tidak terpotong. Pada layar HP panggung menempel di atas dan kartu bergulir di bawahnya.

Filter dan alat jelajah tetap aktif sepanjang halaman, termasuk setelah langkah terakhir: tombol kawasan pada peta dan Sankey, klik simpul Sankey, tombol ukuran matriks, klik kotak treemap dan breadcrumb, tombol urutan hierarki, tombol periode dan ukuran teks, kolom pencarian kata (maksimal 4), tooltip pada semua grafik.

## Sumber data (semua BPS)

1. Statistik Kunjungan Wisatawan Mancanegara 2024 (aliran).
2. Statistik Kunjungan Wisatawan Mancanegara 2025, tabel kunjungan per bulan (tren).
3. Produk Domestik Regional Bruto Provinsi-Provinsi di Indonesia Menurut Lapangan Usaha 2020-2024 (hierarki).
4. Berita Resmi Statistik pariwisata; daftar tiap dokumen, URL, dan tanggal ada di `data/sumber_brs.csv`.

URL dan tanggal akses tiap grafik tampil di keterangan sumber di bawah grafik (diatur di objek `SRC` dalam `app.js`).

Aset non-BPS: bendera dari paket `flag-icons` (MIT); garis pantai dunia dari Natural Earth lewat paket `world-atlas` (domain publik); koordinat titik asal ada di `data/koordinat_negara_asal.csv` (titik tengah negara atau wilayah, perkiraan penulis).

## Pra-proses teks

Skrip: `skrip/proses_korpus_brs.py` lalu `skrip/olah_teks_lanjutan.py`.

1. Ekstraksi teks PDF (pdfplumber), pembuangan header, footer, dan tabel.
2. Case folding (huruf kecil), tokenisasi hanya huruf, buang token kurang dari 3 huruf dan angka romawi.
3. Stopword: daftar Sastrawi ditambah daftar tambahan (istilah umum BRS dan sisa ekstraksi PDF). Daftar tambahan tercatat di `data/teks_meta.json`.
4. Stemming Sastrawi tersedia (`--stem`, kolom `teks_stem`), tetapi tampilan memakai teks tanpa stem agar kata tetap terbaca.
5. Periode berdasarkan bulan data (bukan bulan rilis): pra-pandemi sebelum Mar 2020 (50 dokumen), pandemi Mar 2020 sampai Des 2021 (22), pemulihan sejak Jan 2022 (55).
6. BRS transportasi-murni dikeluarkan. Satu dokumen tematik non-bulanan dibuang, bulan tanpa dokumen: 2015-12, 2016-03, 2025-01.

Kata khas periode memakai log-odds ber-prior Dirichlet, mengikuti pendekatan Monroe, Colaresi, dan Quinn (2008). Verifikasi sitasi ini sebelum masuk daftar pustaka.

## Menjalankan lokal

```
python -m http.server 8000
# buka http://localhost:8000
```
Jangan buka lewat `file://` karena data dimuat dengan `fetch`.

## Aksesibilitas

Warna data memakai palet Okabe-Ito dan Viridis (ramah buta warna). Terakota, teal, dan krem pada tema hanya untuk dekorasi dan teks. Sorotan "terang atau pudar" pada matriks dan Sankey tidak bergantung pada warna saja. Tata letak responsif untuk layar HP, tombol dan simpul bisa difokus dengan keyboard, dan animasi (termasuk pesawat dan transisi) menghormati `prefers-reduced-motion`.

## Keterbatasan

- PDRB memakai harga konstan (ADHK), sehingga porsi antarsektor tidak persis sama dengan struktur nominal (ADHB). PDRB 2023 angka sementara dan 2024 angka sangat sementara.
- Total wisman 2024 menurut tabel bulanan (13.886.678) berbeda dengan total diagram aliran (13.902.420). Sebabnya belum dikonfirmasi.
- Pada total 2020 ada selisih 60 kunjungan antara jumlah bulanan dan tabel tahunan (belum dicek di PDF).
- Teks: kata "penumpang" menghilang setelah data 2023-07 dan "perjalanan/wisnus" muncul sejak 2023-06. Judul BRS menunjukkan sebabnya: sampai data 2023-07 BRS memuat pariwisata sekaligus penumpang angkutan, dan sejak data 2023-08 hanya pariwisata. Jadi ini perubahan format laporan, bukan perubahan bahasa akibat pandemi. Belum ada pernyataan resmi BPS tentang pemisahan itu, dan apakah transportasi kini terbit terpisah belum diperiksa.
- Pintu "Perbatasan Laut/Darat" dan "Pintu lainnya" tidak punya koordinat, jadi tidak tergambar sebagai busur di peta. Persentasenya dicantumkan di bawah peta.
- Titik putus-putus pada peta (misalnya "Eropa Timur Lainnya") adalah titik tengah wilayah, bukan lokasi negara.
- Ilustrasi hero hanya hiasan dan bukan data. Bagian Kesimpulan menghitung semua angkanya dari data yang sama dengan grafik.
- Pengujian dilakukan di Chromium headless (Playwright) pada beberapa ukuran layar. Tampilan di perangkat HP sungguhan perlu dicek manual.

## Deklarasi penggunaan AI

Claude (Anthropic) dipakai sebagai asisten untuk membantu menulis dan merapikan kode, skrip pengolahan teks, desain ulang tampilan, draf teks, dan bagian Kesimpulan. Gambar lanskap Indonesia (INDONESIA_LANDSCAPE) dan pesawat (PESAWAT) disediakan penulis; pesawat statis di lanskap dihapus dengan penambalan langit, dan latar pesawat dihilangkan dengan model rembg (u2net) yang dijalankan lokal karena kredit Magnific tidak tersedia. Jaringan pasangan kata ditata ulang dengan gaya gravitasi dan penghindaran tabrakan label. Seluruh data berasal dari BPS, dan keputusan analisis serta pemeriksaan hasil dilakukan penulis. Sesuaikan paragraf ini dengan pemakaian yang sebenarnya.
