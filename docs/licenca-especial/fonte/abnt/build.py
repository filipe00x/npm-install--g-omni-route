"""Gera o trabalho em duas passagens para que o sumário tenha as páginas corretas."""
import json
import os
import re
import subprocess
import sys

import pymupdf

D = os.path.dirname(os.path.abspath(__file__))
DOCX = os.path.join(D, "Redesenho_Licenca_Especial_ABNT.docx")
PDF = DOCX[:-5] + ".pdf"
PAGES = os.path.join(D, "paginas.json")


def run(cmd):
    subprocess.run(cmd, check=True, cwd=D, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build():
    run(["node", "trabalho.js", DOCX, PAGES])
    if os.path.exists(PDF):
        os.remove(PDF)
    run(["soffice", "-env:UserInstallation=file:///root/lo/prof", "--headless", "--convert-to", "pdf", "--outdir", D, DOCX])


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def locate():
    heads = json.load(open(os.path.join(D, "headings.json")))
    doc = pymupdf.open(PDF)
    texts = [[norm(l) for l in p.get_text().splitlines()] for p in doc]
    start = max(i for i, t in enumerate(texts) if "SUMÁRIO" in t) + 1
    pages, pi = {}, start
    for h in heads:
        target = norm(h)
        while pi < len(texts) and not any(l == target or l.startswith(target) and len(l) - len(target) < 2 for l in texts[pi]):
            pi += 1
        if pi >= len(texts):
            sys.exit(f"título não encontrado: {h}")
        pages[h] = pi  # capa não é contada: página física (base 0) = número exibido
    return pages, len(doc)


if __name__ == "__main__":
    if os.path.exists(PAGES):
        os.remove(PAGES)
    build()
    p1, n1 = locate()
    json.dump(p1, open(PAGES, "w"), ensure_ascii=False, indent=1)
    build()
    p2, n2 = locate()
    assert p1 == p2, "paginação mudou entre as passagens"
    print("páginas:", n2)
    for k, v in p2.items():
        print(f"{v:>3}  {k}")
