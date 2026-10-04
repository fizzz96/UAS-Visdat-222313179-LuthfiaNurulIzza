"""Hitung laju kata per segmen waktu dari data/teks_tren.json -> data/teks_awan.json.

Laju bulanan di teks_tren.json = kemunculan per 10.000 token. Laju segmen = rata-rata tertimbang
jumlah token tiap bulan (bulan tanpa BRS dilewati), sehingga setara laju gabungan seluruh dokumen segmen.
Segmen: pra-pandemi (<2020-03), pandemi (2020-03..2021-12), pemulihan (>=2022-01),
dan pembanding format BRS: sebelum 2023-07 vs 2023-07 dst.
Pakai: python skrip/olah_awan_kata.py
"""
import json, pathlib
D = pathlib.Path(__file__).resolve().parent.parent / "data"
t = json.load(open(D / "teks_tren.json"))
bulan, tok, kata = t["bulan"], t["total_token"], t["kata"]

SEG = {
    "pra":     lambda m: m < "2020-03",
    "pandemi": lambda m: "2020-03" <= m < "2022-01",
    "pulih":   lambda m: m >= "2022-01",
    "sebelum": lambda m: m < "2023-07",
    "sesudah": lambda m: m >= "2023-07",
}
def laju(seri, f):
    num = den = 0.0
    for m, r, n in zip(bulan, seri, tok):
        if r is None or n is None or not f(m):
            continue
        num += r * n; den += n
    return round(num / den, 1) if den else 0.0

seg_token = {k: sum(n for m, n in zip(bulan, tok) if n and f(m)) for k, f in SEG.items()}
seg_bulan = {k: sum(1 for m, n in zip(bulan, tok) if n and f(m)) for k, f in SEG.items()}
out = {
    "meta": {
        "satuan": "kemunculan per 10.000 token",
        "sumber": "data/teks_tren.json (300 kata teratas korpus 127 BRS pariwisata)",
        "potong_format": "2023-07",
        "segmen_token": seg_token, "segmen_bulan": seg_bulan,
    },
    "kata": [{"w": w, **{k: laju(s, f) for k, f in SEG.items()}} for w, s in kata.items()],
}
json.dump(out, open(D / "teks_awan.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(out["meta"]); print(len(out["kata"]), "kata")
