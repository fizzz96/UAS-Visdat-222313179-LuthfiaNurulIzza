# Pintu masuk bukan destinasi

Webstory visualisasi data wisatawan mancanegara (wisman) ke Indonesia, UAS Visualisasi Data dan Informasi (K203407), STIS 2026.

- Webstory: https://fizzz96.github.io/UAS-Visdat-222313179-LuthfiaNurulIzza/
- Repo: https://github.com/fizzz96/UAS-Visdat-222313179-LuthfiaNurulIzza
- Penulis: Luthfia Nurul Izza (222313179)

## Isi cerita

| Bagian | Topik UAS | Teknik |
|---|---|---|
| Pembuka | Aliran | Peta penerbangan digerakkan scroll: garis negara asal → pintu masuk, ikon pesawat/kapal/truk menurut jenis pintu |
| Bab 1 | Aliran | Sankey kawasan → pintu (drill-down ke negara, breadcrumb) dan matriks asal–tujuan (jumlah, pangsa, indeks spesialisasi) |
| Bab 2 | (pendukung) | Garis tren bulanan 2019–2025 dengan pembanding rata-rata 2019 |
| Bab 3 | Hierarki | Treemap dan icicle PDRB 38 provinsi × 17 lapangan usaha; ukuran = PDRB ADHK 2024, warna = pertumbuhan riil 2023→2024; drill-down + breadcrumb; dua urutan hierarki |
| Bab 4 | Teks | Awan kata (hilang/muncul/bertahan), tren kata, jaringan bigram dari 127 BRS pariwisata |

Interaksi: scroll (peta), klik drill-down, tombol segmen, kolom pencarian kata, tooltip.

## Struktur repo

```
index.html
css/style.css
js/        core, peta, sankey, tren, hierarki, teks, akhir
lib/       d3 v7, d3-sankey, d3-cloud, topojson-client (lokal, tanpa CDN)
fonts/     Fraunces (judul) dan DM Sans (isi), woff2 lokal
data/      data olahan (JSON/CSV) + peta_dunia_50m.json (Natural Earth, domain publik)
skrip/     skrip pengolahan (olah_awan_kata.py; skrip korpus lain ditambahkan terpisah)
```

## Menjalankan lokal

Tidak perlu build atau instalasi. Cukup server statis (membuka lewat `file://` tidak bisa memuat JSON):

```
python -m http.server 8000
```

lalu buka http://localhost:8000. Untuk membuat ulang `data/teks_awan.json`: `python skrip/olah_awan_kata.py`.

## Sumber data

Semua data utama dari BPS; judul tabel/publikasi, tahun, URL, dan tanggal akses tercantum di bawah tiap visual.

- Statistik Kunjungan Wisatawan Mancanegara 2024 (aliran negara × pintu masuk)
- Statistik Kunjungan Wisatawan Mancanegara 2025 (tren bulanan)
- PDRB Provinsi-Provinsi di Indonesia Menurut Lapangan Usaha 2020–2024 (ADHK)
- Berita Resmi Statistik pariwisata Nov 2015–Agu 2026 (korpus teks, daftar di `data/sumber_brs.csv`)

Data pendukung non-BPS: basemap Natural Earth 50m dan koordinat pusat negara (`data/koordinat_negara_asal.csv`), hanya untuk menggambar peta.

## Pengolahan teks

Ekstraksi teks PDF → case folding → tokenisasi → stopword (Sastrawi + tambahan) → pembagian periode menurut bulan data (pra-pandemi sebelum Mar 2020, pandemi, pemulihan sejak Jan 2022; pembanding tambahan sebelum/sesudah Jul 2023). Laju kata dinyatakan per 10.000 token. Status awan kata: 45 kata teratas tiap periode dibandingkan (hilang, muncul, bertahan). Dokumen ganda (2022-03) dibuang; bulan tanpa dokumen: 2015-12, 2016-03, 2025-01.

## Keterbatasan

- Data mencatat pintu masuk, bukan destinasi akhir.
- Peta penerbangan menggambar sekitar 69% total kunjungan (negara × pintu berlokasi jelas, ≥ 20.000 kunjungan); garis adalah ilustrasi, bukan rute sebenarnya.
- Total 2024 diagram aliran (13.902.420) berbeda dari jumlah 12 bulan tabel bulanan (13.886.678); jumlah bulanan 2020 juga berbeda tipis dari total tahunan.
- PDRB 2023 sementara dan 2024 sangat sementara.
- Kosakata angkutan (penumpang, barang, kereta, diangkut) ada di 90 dari 91 BRS sampai data Juli 2023 dan di 0 dari 36 BRS sejak data Agustus 2023; "perjalanan" berbalik dari 1 dari 91 menjadi 33 dari 36. Korpus hanya memuat isi BRS, jadi alasan perubahan ini tidak dapat ditentukan darinya.

## Palet dan aksesibilitas

Krem #EFECE6, biru tua #1D3557, merah #E63946, kuning #FFB703 untuk antarmuka; data memakai Okabe-Ito dan Viridis. Merah/hijau tidak dipakai untuk membedakan data. Responsif sampai lebar HP; animasi menghormati `prefers-reduced-motion`.

## Deklarasi penggunaan AI

Claude (Anthropic) dipakai membantu menulis dan merapikan kode, skrip pengolahan teks, dan draf teks halaman. Data dari BPS; keputusan analisis, pemeriksaan hasil, dan isi proyek menjadi tanggung jawab penulis.
