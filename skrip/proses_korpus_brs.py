#!/usr/bin/env python3
"""
Gabungkan PDF BRS (Berita Resmi Statistik) pariwisata menjadi satu korpus bersih.

Cara pakai:
    pip install pdfplumber Sastrawi pandas
    python proses_korpus_brs.py Korpus_BRS_Pariwisata
    python proses_korpus_brs.py Korpus_BRS_Pariwisata --keluar hasil --stem

Keluaran (folder --keluar, default "hasil_korpus"):
    korpus_brs_pariwisata.csv   satu baris per dokumen + metadata + teks
    frekuensi_kata_periode.csv  frekuensi kata/bigram per periode (siap untuk D3)
    log_qa.csv                  catatan kualitas per file (cek yang bermasalah)
"""
import argparse
import re
import unicodedata
from collections import Counter
from pathlib import Path

import pandas as pd
import pdfplumber
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

# ----------------------------------------------------------------------------
# KONFIGURASI (silakan diedit)
# ----------------------------------------------------------------------------
BULAN = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
    "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11,
    "desember": 12,
}

# Batas periode (berdasarkan BULAN DATA yang dibahas BRS, bukan tanggal rilis). Ini asumsi analitis, tulis di makalah.
AWAL_PANDEMI = (2020, 3)      # kasus pertama di Indonesia: Maret 2020
AWAL_PEMULIHAN = (2022, 1)    # mulai Januari 2022

# Kata umum di semua BRS yang tidak informatif untuk analisis.
# Catatan: 'transportasi' sengaja TIDAK dibuang karena BRS ini memuat topik
# transportasi (penumpang, kereta, pesawat) dan itu bisa jadi bahan analisis.
STOP_TAMBAHAN = {
    "bps", "badan", "pusat", "statistik", "berita", "resmi", "persen", "juta",
    "ribu", "miliar", "triliun", "rupiah", "yoy", "mtm", "ctc", "dibandingkan",
    "dibanding", "terhadap", "sebesar", "sebanyak", "mencapai", "sebanding",
    "tahun", "bulan", "triwulan", "nomor", "katalog", "tabel", "gambar", "grafik",
    "sumber", "indonesia", "nasional", "www", "http", "https", "go", "id",
    "pdf", "halaman", "berikut", "lihat", "naik", "turun", "sedangkan",
    *BULAN.keys(),
    # singkatan bulan dari tabel ("Jan", "Jul", ...) dan kata pengisi umum BRS
    "jan", "feb", "mar", "apr", "jun", "jul", "agu", "agt", "sep", "okt", "nov",
    "des", "jumlah", "orang", "ton", "terjadi", "perubahan", "selama", "total",
    "peningkatan", "penurunan", "lainnya", "pada", "periode", "sama", "lalu",
    "perkembangan", "diamati", "tercatat", "yaitu", "antara", "sebelumnya",
}

MIN_KATA_WAJAR = 300   # di bawah ini dicurigai PDF hasil scan / gagal ekstrak


# ----------------------------------------------------------------------------
# PEMBERSIHAN TEKS
# ----------------------------------------------------------------------------
def siapkan_stopword():
    sw = set(StopWordRemoverFactory().get_stop_words())
    return sw | STOP_TAMBAHAN


def normalisasi(teks: str) -> str:
    """Rapikan hasil ekstraksi PDF sebelum tokenisasi."""
    teks = unicodedata.normalize("NFKC", teks)             # ligatur fi, fl, dll.
    teks = re.sub(r"-\s*\n\s*(?=[a-z])", "", teks)           # sambung kata terpotong baris
    # watermark / footer BPS: "bps.go.id", "www.bps.go.id", varian berspasi
    teks = re.sub(r"(?i)\b(?:w\s*w\s*w\s*\.?\s*)?b\s*p\s*s\s*\.\s*g\s*o\s*\.\s*i\s*d\b",
                  " ", teks)
    teks = re.sub(r"\s+", " ", teks)
    return teks


POLA_FOOTER = re.compile(
    r"(?i)(bps\.go\.id|dilarang mereproduksi|telp\s*:|fax|e-mail|jl\. dr|hak cipta|"
    r"publikasi, berita resmi|tabel dinamis|gawai anda|sst\.|m\.si|direktur statistik|"
    r"untuk informasi lebih lanjut|layanan perpustakaan)")


def buang_header_footer(teks: str) -> str:
    """Buang header/footer yang berulang di tiap halaman BRS, mis.
    'BRS No. 90/09/Th. XXIX, 1 September 2026' dan
    '2 Perkembangan Transportasi Indonesia Juli 2026'."""
    keluar = []
    for baris in teks.split("\n"):
        b = baris.strip()
        if b.startswith("|"):                       # tabel hasil konversi md
            continue
        if POLA_FOOTER.search(b):                   # blok kontak/hak cipta BPS
            continue
        tok = b.split()
        if len(tok) >= 4 and sum(len(t) == 1 for t in tok) / len(tok) > 0.4:
            continue                                # infografis rusak "K e re t a A p i"
        if re.match(r"(?i)^BRS\s+No\.", b):
            continue
        if len(b) < 90 and re.match(r"(?i)^(\d+\s+)?Perkembangan\b.*\b20\d{2}(\s+\d+)?$", b):
            continue
        keluar.append(baris)
    return "\n".join(keluar)


def deteksi_jenis(teks_hal1: str) -> str:
    """Tebak jenis BRS dari judul (awal halaman 1)."""
    judul = teks_hal1[:400].lower()
    ada_p = any(k in judul for k in ("pariwisata", "wisatawan", "wisman", "penghunian kamar"))
    ada_t = "transportasi" in judul
    if ada_p and ada_t:
        return "pariwisata_dan_transportasi"
    if ada_p:
        return "pariwisata"
    if ada_t:
        return "transportasi"
    return "lainnya"


def tokenisasi(teks: str, stopword: set) -> list:
    """huruf kecil -> hanya huruf -> buang kata <3 huruf dan stopword."""
    teks = teks.lower()
    token = re.findall(r"[a-z]+", teks)
    # buang juga angka romawi (mis. "xxii" dari nomor BRS "Th. XXII")
    return [t for t in token
            if len(t) >= 3 and t not in stopword and not re.fullmatch(r"[ivxlcdm]+", t)]


def buat_stemmer():
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    stemmer = StemmerFactory().create_stemmer()
    cache = {}

    def stem_kata(k):
        if k not in cache:
            cache[k] = stemmer.stem(k)
        return cache[k]

    return stem_kata


# ----------------------------------------------------------------------------
# METADATA: TANGGAL RILIS & PERIODE
# ----------------------------------------------------------------------------
POLA_TANGGAL = re.compile(
    r"\b(\d{1,2})\s+(" + "|".join(BULAN) + r")\s+(20\d{2})\b", re.IGNORECASE)
POLA_NOMOR = re.compile(r"No\.?\s*\d+\s*/\s*(\d{2})\s*/\s*Th", re.IGNORECASE)
POLA_FILE = re.compile(r"(20\d{2})[-_ .]?(\d{2})")


def cari_tanggal(teks_hal1: str, nama_file: str):
    """Kembalikan (tahun, bulan, sumber). Prioritas: header BRS, nomor BRS, nama file."""
    m = POLA_TANGGAL.search(teks_hal1)
    if m:
        return int(m.group(3)), BULAN[m.group(2).lower()], "tanggal_header"

    n = POLA_NOMOR.search(teks_hal1)
    thn = re.search(r"\b(20\d{2})\b", teks_hal1)
    if n and thn and 1 <= int(n.group(1)) <= 12:
        return int(thn.group(1)), int(n.group(1)), "nomor_brs"

    f = POLA_FILE.search(nama_file)
    if f and 1 <= int(f.group(2)) <= 12:
        return int(f.group(1)), int(f.group(2)), "nama_file"

    return None, None, "tidak_ketemu"


POLA_BLN_THN = re.compile(r"\b(" + "|".join(BULAN) + r")\s+(20\d{2})\b", re.IGNORECASE)


def cari_bulan_data(teks_awal: str):
    """Bulan yang DIBAHAS BRS (judul, mis. 'Juli 2026'), bukan bulan rilis ('1 September 2026')."""
    kepala = POLA_TANGGAL.sub(" ", teks_awal[:400])
    m = POLA_BLN_THN.search(kepala)
    return (int(m.group(2)), BULAN[m.group(1).lower()]) if m else (None, None)


def tentukan_periode(tahun, bulan):
    if tahun is None:
        return "tidak_diketahui"
    if (tahun, bulan) < AWAL_PANDEMI:
        return "1_pra_pandemi"
    if (tahun, bulan) < AWAL_PEMULIHAN:
        return "2_pandemi"
    return "3_pemulihan"


# ----------------------------------------------------------------------------
# BACA PDF
# ----------------------------------------------------------------------------
def baca_pdf(path: Path):
    if path.suffix.lower() in (".md", ".txt"):      # hasil konversi yang sudah berupa teks
        return [path.read_text(encoding="utf-8", errors="ignore")]
    halaman = []
    with pdfplumber.open(path) as pdf:
        for p in pdf.pages:
            halaman.append(p.extract_text() or "")
    return halaman


# ----------------------------------------------------------------------------
# UTAMA
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", help="folder berisi PDF BRS")
    ap.add_argument("--keluar", default="hasil_korpus", help="folder keluaran")
    ap.add_argument("--stem", action="store_true",
                    help="tambah kolom teks_stem (Sastrawi, lebih lambat)")
    ap.add_argument("--tanpa-mentah", action="store_true",
                    help="jangan simpan teks_mentah (file CSV lebih kecil)")
    ap.add_argument("--jenis", default="semua",
                    help="jenis BRS yang dihitung frekuensinya, dipisah koma: "
                         "pariwisata,pariwisata_dan_transportasi,transportasi "
                         "(default: semua)")
    ap.add_argument("--top", type=int, default=100,
                    help="jumlah kata teratas per periode (default 100)")
    args = ap.parse_args()

    folder = Path(args.folder)
    keluar = Path(args.keluar)
    keluar.mkdir(parents=True, exist_ok=True)
    daftar = sorted(p for p in folder.rglob("*") if p.suffix.lower() in (".pdf", ".md", ".txt"))
    if not daftar:
        raise SystemExit(f"Tidak ada PDF/md/txt di folder: {folder}")

    stopword = siapkan_stopword()
    stem_kata = buat_stemmer() if args.stem else None
    print(f"Memproses {len(daftar)} PDF...")

    baris, log, token_per_dok = [], [], []
    for i, path in enumerate(daftar, 1):
        try:
            halaman = baca_pdf(path)
            mentah = buang_header_footer("\n".join(halaman))
            bersih_teks = normalisasi(mentah)
            awal = normalisasi(halaman[0]) if halaman else ""
            tahun_rilis, bulan_rilis, sumber = cari_tanggal(awal, path.name)
            tahun, bulan = cari_bulan_data(awal)
            if tahun is None:                       # cadangan: pakai bulan rilis
                tahun, bulan = tahun_rilis, bulan_rilis
            token = tokenisasi(bersih_teks, stopword)
            jenis = deteksi_jenis(halaman[0] if halaman else "")
            status = "ok"
            if len(token) < MIN_KATA_WAJAR:
                status = "TEKS_SEDIKIT (kemungkinan scan, perlu OCR)"
            if sumber == "tidak_ketemu":
                status += " | TANGGAL_TIDAK_KETEMU"
        except Exception as e:  # satu PDF rusak tidak boleh menghentikan semuanya
            log.append({"nama_file": path.name, "status": f"GAGAL: {e}",
                        "n_halaman": 0, "n_token": 0, "sumber_tanggal": ""})
            print(f"[{i}/{len(daftar)}] GAGAL  {path.name}: {e}")
            continue

        row = {
            "nama_file": path.name,
            "tahun_rilis": tahun_rilis,
            "bulan_rilis": bulan_rilis,
            "tahun_data": tahun,
            "bulan_data": bulan,
            "periode": tentukan_periode(tahun, bulan),
            "jenis_brs": jenis,
            "n_halaman": len(halaman),
            "n_token": len(token),
        }
        if not args.tanpa_mentah:
            row["teks_mentah"] = bersih_teks
        row["teks_bersih"] = " ".join(token)
        if stem_kata:
            row["teks_stem"] = " ".join(stem_kata(t) for t in token)
        baris.append(row)
        token_per_dok.append(token)
        log.append({"nama_file": path.name, "status": status, "jenis_brs": jenis,
                    "n_halaman": len(halaman), "n_token": len(token),
                    "sumber_tanggal": sumber})
        print(f"[{i}/{len(daftar)}] {status[:2]:2s}  {path.name[:60]}")

    korpus = pd.DataFrame(baris)
    korpus.to_csv(keluar / "korpus_brs_pariwisata.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(log).to_csv(keluar / "log_qa.csv", index=False, encoding="utf-8-sig")

    # ---- frekuensi per periode (unigram + bigram) ----
    hasil = []
    sel = korpus
    if args.jenis != "semua":
        sel = korpus[korpus.jenis_brs.isin(args.jenis.split(","))]
    # dokumen ganda (bulan data + jenis sama, mis. terunduh dua kali) hanya dihitung sekali
    dup = sel.duplicated(["jenis_brs", "tahun_data", "bulan_data"], keep="first")
    if dup.any():
        print(f"Peringatan: {int(dup.sum())} dokumen ganda dilewati di frekuensi.")
    sel = sel[~dup]
    for periode, grup in sel.groupby("periode"):
        dok = [token_per_dok[j] for j in grup.index]
        total_token = sum(len(d) for d in dok)
        for jenis, ambil in (("unigram", lambda d: d),
                             ("bigram", lambda d: [f"{a} {b}" for a, b in zip(d, d[1:])])):
            frek, df_dok = Counter(), Counter()
            for d in dok:
                unit = ambil(d)
                frek.update(unit)
                df_dok.update(set(unit))
            for kata, f in frek.most_common(args.top):
                hasil.append({
                    "periode": periode, "jenis": jenis, "kata": kata,
                    "frekuensi": f, "jumlah_dokumen": df_dok[kata],
                    "jumlah_dokumen_periode": len(dok),
                    "per_10rb_token": round(f / total_token * 10000, 2),
                })
    pd.DataFrame(hasil).to_csv(keluar / "frekuensi_kata_periode.csv",
                               index=False, encoding="utf-8-sig")

    # ---- ringkasan ----
    print("\n=== RINGKASAN ===")
    print(korpus.groupby(["periode", "jenis_brs"]).agg(
        dokumen=("nama_file", "count"), token=("n_token", "sum")))
    print("\nDokumen per tahun data:")
    print(korpus.groupby("tahun_data").size().to_string())
    lg = pd.DataFrame(log)
    bermasalah = lg[~lg.status.eq("ok")]
    if len(bermasalah):
        print(f"\n{len(bermasalah)} file perlu dicek (lihat log_qa.csv):")
        print(bermasalah[["nama_file", "status"]].to_string(index=False))
    print(f"\nSelesai. Hasil di folder: {keluar.resolve()}")


if __name__ == "__main__":
    main()
