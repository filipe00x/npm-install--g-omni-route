"""Troca a Figura 3 do trabalho (docx do usuário) pelo fluxo BPMN e põe a figura em página paisagem."""
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

src, png, dst = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
if dst.exists():
    shutil.rmtree(dst)
shutil.copytree(src, dst)
doc = dst / "word/document.xml"
x = doc.read_text(encoding="utf-8")

paras = list(re.finditer(r"<w:p[ >].*?</w:p>", x, re.S))
text = lambda m: "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", m.group(0)))
idx_intro = next(i for i, m in enumerate(paras) if text(m).startswith("A Figura 3 mostra o fluxo"))
idx_cap = idx_intro + 1
idx_img = idx_intro + 2
idx_quadro = next(i for i, m in enumerate(paras) if text(m).startswith("Quadro 4 –"))
idx_leitura = next(i for i, m in enumerate(paras) if text(m).startswith("Na Figura 3, cada quadro"))
assert text(paras[idx_cap]).startswith("Figura 3 –") and "<w:drawing" in paras[idx_img].group(0)
spacers = range(idx_img + 1, idx_quadro)
assert all("<w:r>" not in paras[i].group(0) and "<w:r " not in paras[i].group(0) for i in spacers)

body_sect = re.findall(r"<w:sectPr\b.*?</w:sectPr>", x, re.S)[-1]
assert 'w:w="11906" w:h="16838"' in body_sect and "pgNumType" not in body_sect
retrato = body_sect
paisagem = body_sect.replace('<w:pgSz w:w="11906" w:h="16838"/>',
                             '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>')

# imagem: 24 cm de largura, proporção do PNG
w_px, h_px = Image.open(png).size
cx = 24 * 360000
cy = round(cx * h_px / w_px)
rel = re.search(r'r:embed="([^"]+)"', paras[idx_img].group(0)).group(1)
rels = (dst / "word/_rels/document.xml.rels").read_text(encoding="utf-8")
target = re.search(rf'Id="{rel}"[^>]*Target="([^"]+)"', rels).group(1)
shutil.copyfile(png, dst / "word" / target)

img = paras[idx_img].group(0)
img = re.sub(r'<wp:extent cx="\d+" cy="\d+"/>', f'<wp:extent cx="{cx}" cy="{cy}"/>', img)
img = re.sub(r'<a:ext cx="\d+" cy="\d+"/>', f'<a:ext cx="{cx}" cy="{cy}"/>', img)
img = img.replace('name="fig3_processo_proposto.png"', 'name="fig3_processo_proposto_bpmn.png"')
img = img.replace('descr="Fluxo do processo proposto (TO-BE)"',
                  'descr="Fluxo do processo proposto (TO-BE) em notação BPMN"')
img = img.replace("<w:pPr><w:keepNext/><w:jc w:val=\"center\"/></w:pPr>",
                  f"<w:pPr><w:jc w:val=\"center\"/>{paisagem}</w:pPr>")
assert paisagem in img

intro = paras[idx_intro].group(0)
ppr = re.search(r"<w:pPr>.*?</w:pPr>", intro, re.S).group(0)
R = lambda t, i=False: f'<w:r>{"<w:rPr><w:i/><w:iCs/></w:rPr>" if i else ""}<w:t xml:space="preserve">{t}</w:t></w:r>'
intro_new = (intro[: intro.index("<w:pPr>")] + ppr.replace("</w:pPr>", retrato + "</w:pPr>")
             + R("A Figura 3 representa o fluxo na notação BPMN (")
             + R("Business Process Model and Notation", True)
             + R("), padrão adotado por ferramentas de modelagem como o Bizagi Modeler. Cada participante ocupa "
                 "uma raia horizontal, e as atividades se encadeiam da esquerda para a direita. Na sequência, o "
                 "Quadro 4 apresenta a matriz de responsabilidades (RACI) correspondente.")
             + "</w:p>")

leit = paras[idx_leitura].group(0)
ppr_l = re.search(r"<w:pPr>.*?</w:pPr>", leit, re.S).group(0)
leit_new = (leit[: leit.index("<w:pPr>")] + ppr_l
            + R("Na Figura 3, os retângulos representam as atividades; os losangos, as decisões; e os círculos, "
                "os eventos de início, de tempo e de fim. A decisão do ComPel evidencia a gestão por exceção: o "
                "veto só é registrado quando há impedimento; caso contrário, a relação segue diretamente para o "
                "ComCia (Asp). Os eventos de tempo marcam os dois horários fixos do processo, o encerramento dos "
                "pedidos às 12h30 e a liberação a partir das 17h00. Tudo o que ocorre entre eles acontece durante "
                "a rotina, sem exigir deslocamento do aspirante, que executa apenas duas atividades: registrar o "
                "pedido e consultar o resultado.")
            + "</w:p>")

out, last = [], 0
for i, m in enumerate(paras):
    if i in (idx_intro, idx_img, idx_leitura) or i in spacers:
        out.append(x[last:m.start()])
        out.append({idx_intro: intro_new, idx_img: img, idx_leitura: leit_new}.get(i, ""))
        last = m.end()
out.append(x[last:])
doc.write_text("".join(out), encoding="utf-8")
print(f"figura {cx / 360000:.1f} x {cy / 360000:.2f} cm; espaçadores removidos: {len(spacers)}; imagem: {target}")
