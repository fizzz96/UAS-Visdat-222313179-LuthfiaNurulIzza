#!/usr/bin/env python3
"""
Olah korpus BRS (keluaran proses_korpus_brs.py) menjadi JSON siap D3:
  1. frekuensi kata per periode        -> teks_frekuensi.json
  2. TF-IDF per periode                -> teks_tfidf.json
  3. kata khas periode (log-odds)      -> teks_khas.json      (BARU)
  3b. perbandingan langsung dgn pra-pandemi -> teks_banding.json (BARU)
  4. tren kata per bulan (filter)      -> teks_tren.json      (sumbu bulan penuh, bulan kosong = null)
  5. jaringan bigram per periode       -> teks_bigram.json
  + metadata korpus                    -> teks_meta.json      (bulan kosong, dokumen dobel yang dibuang)

Pakai:
    python olah_teks_lanjutan.py hasil_korpus/korpus_brs_pariwisata.csv --keluar data

Catatan metodologi:
  * Hanya dokumen berjenis pariwisata / pariwisata_dan_transportasi yang dipakai.
  * Bila satu bulan data punya >1 dokumen, dipakai yang lebih panjang; yang dibuang dicatat di meta.
  * Stopword: STOP_EXTRA berlaku untuk semua visual (termasuk kode bulan terbalik hasil ekstraksi
    PDF dan sisa tokenisasi). STOP_UNI (arah mata angin) hanya dibuang dari tampilan unigram
    (frekuensi, tf-idf, khas, tren), BUKAN dari bigram, agar "papua barat" tidak pecah.
  * TF-IDF: tiap BRS = satu dokumen; IDF dihitung di seluruh korpus, sehingga kata yang ada di
    hampir semua BRS (kunjungan, pintu) berbobot ~1 dan hasilnya mirip frekuensi. Karena itu
    ditambahkan 'kata khas periode'.
  * Kata khas: log-odds ber-prior Dirichlet informatif (z-score), periode vs dua periode lain,
    prior = frekuensi seluruh korpus (A0 = 500). Mengikuti pendekatan "Fightin' Words" (Monroe,
    Colaresi & Quinn, 2008); VERIFIKASI sitasi ini sendiri sebelum masuk daftar pustaka.
  * Bigram dihitung dari token berurutan SETELAH stopword dibuang.
"""
import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

LABEL = {"1_pra_pandemi": "Pra-pandemi", "2_pandemi": "Pandemi", "3_pemulihan": "Pemulihan"}
# Kode bulan TERBALIK: label sumbu grafik di PDF terbaca dari kanan ke kiri (naj=jan, bef=feb, ...)
BULAN_TERBALIK = {"naj", "bef", "ram", "rpa", "iem", "nuj", "luj", "tga", "pes", "tko", "von", "sed"}
STOP_EXTRA = {"sebesar", "mencapai", "dibandingkan", "periode", "data", "angka", "jumlah",
              "rata", "thd", "masing", "poin", "hari",
              "telepon", "pesawat", "year"} | BULAN_TERBALIK
# telepon/pesawat: kop kontak BRS (berhenti 2021-07); year: istilah Inggris
STOP_UNI = {"barat", "timur", "utara", "selatan", "tengah"}
A0 = 500  # total pseudo-count prior untuk kata khas


def baca(path, kolom, buang=()):
    df = pd.read_csv(path, encoding="utf-8-sig")
    df = df[df["jenis_brs"].astype(str).str.startswith("pariwisata")].copy()
    dikecualikan = sorted(set(df.nama_file) & set(buang))
    df = df[~df.nama_file.isin(buang)]
    df = df.dropna(subset=["tahun_data", "bulan_data", kolom])
    df["ym"] = df.tahun_data.astype(int).astype(str) + "-" + df.bulan_data.astype(int).astype(str).str.zfill(2)
    # satu dokumen per bulan data (ambil yang terpanjang), catat yang dibuang
    df = df.sort_values(["ym", "n_token"], ascending=[True, False])
    dobel = [{"ym": r.ym, "file_dibuang": r.nama_file, "n_token": int(r.n_token)}
             for r in df[df.duplicated("ym", keep="first")].itertuples()]
    df = df.drop_duplicates("ym", keep="first")
    toks = df[kolom].astype(str).str.split()
    df["tok"] = toks.map(lambda t: [w for w in t if w not in STOP_EXTRA])          # untuk bigram
    df["tok_uni"] = df["tok"].map(lambda t: [w for w in t if w not in STOP_UNI])   # untuk unigram
    return df.reset_index(drop=True), dobel, dikecualikan


def simpan(obj, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {path.name:22s} {path.stat().st_size / 1024:7.1f} KB")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("korpus_csv")
    ap.add_argument("--keluar", default="data")
    ap.add_argument("--kolom", default="teks_bersih", choices=["teks_bersih", "teks_stem"])
    ap.add_argument("--top", type=int, default=25, help="kata teratas per periode")
    ap.add_argument("--kata-tren", type=int, default=300, help="jumlah kata yang bisa dicari di grafik tren")
    ap.add_argument("--putus-format", default="2023-07",
                    help="bulan data terakhir sebelum format BRS berubah (penumpang hilang, perjalanan muncul)")
    ap.add_argument("--buang", nargs="*", default=["2023-05-02_2041.pdf"],
                    help="nama file BRS non-bulanan yang dikecualikan (default: BRS tematik Pariwisata Domestik 2022)")
    ap.add_argument("--bigram", type=int, default=60, help="jumlah bigram teratas per periode")
    a = ap.parse_args()

    out = Path(a.keluar)
    out.mkdir(parents=True, exist_ok=True)
    df, dobel, dikec = baca(a.korpus_csv, a.kolom, a.buang)
    if df.empty:
        raise SystemExit("Tidak ada dokumen pariwisata di korpus.")
    N = len(df)
    print(f"{N} dokumen pariwisata, kolom '{a.kolom}'; {len(dobel)} dokumen dobel dibuang; dikecualikan manual: {dikec or '-'}")

    # bulan kosong pada sumbu waktu penuh
    semua_bulan = [str(p) for p in pd.period_range(df.ym.min(), df.ym.max(), freq="M")]
    ada = set(df.ym)
    kosong = [m for m in semua_bulan if m not in ada]
    if kosong:
        print("Bulan data tanpa dokumen:", ", ".join(kosong))

    # ---------- df (jumlah dokumen berisi kata) untuk IDF ----------
    DF = Counter()
    for t in df.tok_uni:
        DF.update(set(t))
    idf = {w: math.log((N + 1) / (c + 1)) + 1 for w, c in DF.items()}
    ALL = Counter()
    for t in df.tok_uni:
        ALL.update(t)
    N_ALL = sum(ALL.values())

    periodes = [p for p in LABEL if p in set(df.periode)]
    frek_out, tfidf_out, khas_out, bigram_out, meta_p = {}, {}, {}, {}, []
    per_frek, per_dfp, per_tot = {}, {}, {}

    for p in periodes:
        g = df[df.periode == p]
        tot = sum(len(t) for t in g.tok_uni)
        frek, dfp = Counter(), Counter()
        skor = defaultdict(float)
        for t in g.tok_uni:
            c = Counter(t)
            frek.update(c)
            dfp.update(c.keys())
            for w, n in c.items():
                skor[w] += (n / len(t)) * idf[w]
        bi = Counter()
        for t in g.tok:
            bi.update(zip(t, t[1:]))
        per_frek[p], per_dfp[p], per_tot[p] = frek, dfp, tot
        # kata yang cuma muncul di <3 dokumen periode itu dianggap bising
        ok = [w for w in frek if dfp[w] >= 3]
        frek_out[p] = [{"kata": w, "frek": frek[w], "per10rb": round(frek[w] / tot * 1e4, 1), "dok": dfp[w]}
                       for w in sorted(ok, key=lambda w: -frek[w])[: a.top]]
        tfidf_out[p] = [{"kata": w, "skor": round(skor[w] / len(g), 5), "dok": dfp[w]}
                        for w in sorted(ok, key=lambda w: -skor[w])[: a.top]]
        top_bi = [(k, v) for k, v in bi.most_common() if k[0] != k[1]][: a.bigram]
        deg = Counter()
        for (x, y), v in top_bi:
            deg[x] += v
            deg[y] += v
        bigram_out[p] = {"nodes": [{"id": w, "bobot": n} for w, n in deg.items()],
                         "links": [{"source": x, "target": y, "value": v} for (x, y), v in top_bi]}
        meta_p.append({"id": p, "label": LABEL[p], "n_dok": len(g), "n_token": tot,
                       "awal": g.ym.min(), "akhir": g.ym.max()})

    # ---------- kata khas periode: log-odds ber-prior (periode vs periode lain) ----------
    for p in periodes:
        yi_tot = per_tot[p]
        yj_tot = N_ALL - yi_tot
        hasil = []
        for w in per_frek[p]:
            if per_dfp[p][w] < 3 or per_frek[p][w] < 5:
                continue
            aw = A0 * ALL[w] / N_ALL
            yi, yj = per_frek[p][w], ALL[w] - per_frek[p][w]
            if yj_tot <= 0:
                continue
            delta = (math.log((yi + aw) / (yi_tot + A0 - yi - aw))
                     - math.log((yj + aw) / (yj_tot + A0 - yj - aw)))
            z = delta / math.sqrt(1 / (yi + aw) + 1 / (yj + aw))
            if z > 0:
                hasil.append((w, z, yi, yj))
        hasil.sort(key=lambda x: -x[1])
        khas_out[p] = [{"kata": w, "z": round(z, 2), "frek": yi,
                        "per10rb": round(yi / yi_tot * 1e4, 1),
                        "per10rb_lain": round(yj / yj_tot * 1e4, 1), "dok": per_dfp[p][w]}
                       for w, z, yi, yj in hasil[: a.top]]

    # ---------- perbandingan langsung terhadap pra-pandemi (+ kontrol putus-format) ----------
    def hitung_banding(ga, gb, label_a, label_b):
        fa, fb, dfa = Counter(), Counter(), Counter()
        for t in ga.tok_uni:
            c = Counter(t)
            fa.update(c)
            dfa.update(c.keys())
        for t in gb.tok_uni:
            fb.update(t)
        na, nb = sum(fa.values()), sum(fb.values())
        gab = fa + fb
        nt = na + nb
        hs = []
        for w in set(fa) | set(fb):
            if gab[w] < 10:
                continue
            aw = A0 * gab[w] / nt
            ya, yb = fa[w], fb[w]
            d = (math.log((ya + aw) / (na + A0 - ya - aw)) - math.log((yb + aw) / (nb + A0 - yb - aw)))
            z = d / math.sqrt(1 / (ya + aw) + 1 / (yb + aw))
            hs.append((w, z, ya, yb))
        hs.sort(key=lambda x: -x[1])
        f = lambda x: {"kata": x[0], "z": round(x[1], 2), "per10rb_a": round(x[2] / na * 1e4, 1),
                       "per10rb_b": round(x[3] / nb * 1e4, 1)}
        return {"a": label_a, "b": label_b, "n_dok_a": len(ga), "n_dok_b": len(gb),
                "naik": [f(x) for x in hs if x[1] > 0][: a.top],
                "turun": [f(x) for x in hs[::-1] if x[1] < 0][: a.top]}

    banding = {}
    gp = df[df.periode == "1_pra_pandemi"]
    for kunci, g, lab in [("pandemi_vs_pra", df[df.periode == "2_pandemi"], "Pandemi"),
                          ("pemulihan_awal_vs_pra", df[(df.periode == "3_pemulihan") & (df.ym <= a.putus_format)],
                           f"Pemulihan s.d. {a.putus_format}")]:
        if len(g) and len(gp):
            banding[kunci] = hitung_banding(g, gp, lab, "Pra-pandemi")

    # ---------- tren bulanan (sumbu penuh, bulan kosong = null) ----------
    pos = {m: i for i, m in enumerate(df.ym)}
    tok_u = list(df.tok_uni)
    kandidat = [w for w, c in ALL.most_common() if DF[w] >= 5][: a.kata_tren]
    cnts = [Counter(t) for t in tok_u]
    tren, tot_bln = {}, []
    for m in semua_bulan:
        tot_bln.append(len(tok_u[pos[m]]) if m in pos else None)
    for w in kandidat:
        tren[w] = [round(cnts[pos[m]][w] / len(tok_u[pos[m]]) * 1e4, 1) if m in pos and tok_u[pos[m]] else None
                   for m in semua_bulan]

    print("Menyimpan:")
    simpan({"periode": meta_p, "bulan_awal": semua_bulan[0], "bulan_akhir": semua_bulan[-1], "n_dokumen": N,
            "kolom_teks": a.kolom, "n_token_total": int(sum(len(t) for t in tok_u)),
            "bulan_tanpa_dokumen": kosong, "dokumen_dikecualikan": dikec, "dokumen_dobel_dibuang": dobel,
            "stopword_tambahan": sorted(STOP_EXTRA), "stopword_hanya_unigram": sorted(STOP_UNI), "putus_format": a.putus_format,
            "dokumen": [{"ym": r.ym, "file": r.nama_file, "periode": r.periode, "n_token": int(r.n_token)}
                        for r in df.itertuples()]}, out / "teks_meta.json")
    simpan(frek_out, out / "teks_frekuensi.json")
    simpan(tfidf_out, out / "teks_tfidf.json")
    simpan(khas_out, out / "teks_khas.json")
    simpan(banding, out / "teks_banding.json")
    simpan({"bulan": semua_bulan, "total_token": tot_bln, "satuan": "kemunculan per 10.000 token", "kata": tren},
           out / "teks_tren.json")
    simpan(bigram_out, out / "teks_bigram.json")

    print("\nPeriksa cepat (5 kata teratas):")
    for p in periodes:
        print(f"  {LABEL[p]:12s} frek : ", ", ".join(x["kata"] for x in frek_out[p][:5]))
        print(f"  {'':12s} khas : ", ", ".join(x["kata"] for x in khas_out[p][:5]))
    for k, v in banding.items():
        print(f"  {k}: naik ->", ", ".join(x["kata"] for x in v["naik"][:6]), "| turun ->", ", ".join(x["kata"] for x in v["turun"][:6]))


if __name__ == "__main__":
    main()
