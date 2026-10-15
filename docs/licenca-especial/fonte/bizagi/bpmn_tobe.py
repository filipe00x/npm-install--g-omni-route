"""Figura 3 – processo proposto (TO-BE) em BPMN, no padrão visual do Bizagi Modeler.

Gera, a partir do mesmo modelo e das mesmas coordenadas:
  * fig3_processo_proposto_bpmn.png  (figura do trabalho)
  * Licenca_Especial_TO-BE.bpmn      (BPMN 2.0 com diagrama, importável no Bizagi Modeler:
                                      Exportar/Importar > Importar > BPMN)
"""
import math
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, FancyBboxPatch, Polygon, Rectangle

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
plt.rcParams["font.family"] = "Liberation Sans"

# ------------------------------------------------------------------ geometria (px, y para baixo)
POOL_BAND, LANE_BAND = 30, 34
X0 = POOL_BAND + LANE_BAND + 14
NARROW, WIDE = 74, 128
TW, TH = 114, 68            # tarefa
EV, GW = 32, 42             # diâmetro do evento, diagonal do gateway

cols = [NARROW, WIDE, WIDE, NARROW + 18, WIDE, WIDE, NARROW + 6, WIDE, WIDE, NARROW]
cx, x = [], X0
for w in cols:
    cx.append(x + w / 2)
    x += w
POOL_W = x + 12

lanes = [("Aspirante", "Aspirante", 146), ("Encarregado\nde Licenças", "Encarregado de Licenças", 102),
         ("ComPel (Asp)", "ComPel (Asp)", 102), ("ComCia (Asp)", "ComCia (Asp)", 102),
         ("ComCia\n(Tenente)", "ComCia (Tenente)", 102), ("Polícia", "Polícia", 102)]
lane_y, y = [], 0
for _, _, h in lanes:
    lane_y.append((y, h))
    y += h
POOL_H = y


def mid(lane):
    y0, h = lane_y[lane]
    return y0 + h / 2


ROW_MAIN0 = lane_y[0][0] + 92   # linha principal da raia do aspirante
ROW_TOP0 = lane_y[0][0] + 32    # linha superior (fim "pedido negado")

# id: (tipo, coluna, y, rótulo da figura, raia)
nodes = {
    "Inicio": ("start", 0, ROW_MAIN0, "Licença especial\ndesejada", 0),
    "T1": ("task", 1, ROW_MAIN0, "Registrar\no pedido\n(até 12h30)", 0),
    "Prazo1230": ("timer", 1, mid(1), "12h30: fim\ndos pedidos", 1),
    "T2": ("task", 2, mid(1), "Consolidar e\nconferir os\npedidos\n(até 13h30)", 1),
    "T3": ("task", 2, mid(2), "Tomar ciência\nda relação\n(até 14h00)", 2),
    "G1": ("gateway", 3, mid(2), "Há\nimpedimento?", 2),
    "T4": ("task", 4, mid(2), "Registrar o\nveto, com\nmotivo", 2),
    "T5": ("task", 4, mid(3), "Revisar a RDLE\ne dar o visto\n(até 15h00)", 3),
    "T6": ("task", 4, mid(4), "Aprovar a RDLE\nem lote\n(até 16h00)", 4),
    "T7": ("task", 5, mid(1), "Publicar a RDLE\ne enviar ao\nPolícia (16h30)", 1),
    "T8": ("task", 5, ROW_MAIN0, "Consultar o\nresultado", 0),
    "G2": ("gateway", 6, ROW_MAIN0, "Pedido\naprovado?", 0),
    "FimNegado": ("end", 7, ROW_TOP0, "Pedido negado,\ncom motivo", 0),
    "Prazo1700": ("timer", 7, ROW_MAIN0, "17h00", 0),
    "T9": ("task", 7, mid(5), "Conferir a\nidentidade e\nregistrar\na saída", 5),
    "T10": ("task", 8, mid(1), "Baixar o saldo\n(dia seguinte,\naté 08h00)", 1),
    "Fim": ("end", 9, mid(1), "Licença\nregistrada", 1),
}


def box(n):
    kind, c, yc, _, _ = nodes[n]
    xc = cx[c]
    if kind == "task":
        return xc - TW / 2, yc - TH / 2, TW, TH
    if kind == "gateway":
        return xc - GW / 2, yc - GW / 2, GW, GW
    return xc - EV / 2, yc - EV / 2, EV, EV


def port(n, side):
    x, y, w, h = box(n)
    return {"l": (x, y + h / 2), "r": (x + w, y + h / 2), "t": (x + w / 2, y), "b": (x + w / 2, y + h)}[side]


def route(a, sa, b, sb, via=()):
    return [port(a, sa), *via, port(b, sb)]


g1x, g1y = port("G1", "b")
g2x, _ = port("G2", "t")
flows = [
    ("F1", "Inicio", "T1", "", route("Inicio", "r", "T1", "l")),
    ("F2", "T1", "Prazo1230", "", route("T1", "b", "Prazo1230", "t")),
    ("F3", "Prazo1230", "T2", "", route("Prazo1230", "r", "T2", "l")),
    ("F4", "T2", "T3", "", route("T2", "b", "T3", "t")),
    ("F5", "T3", "G1", "", route("T3", "r", "G1", "l")),
    ("F6", "G1", "T4", "Sim", route("G1", "r", "T4", "l")),
    ("F7", "G1", "T5", "Não", route("G1", "b", "T5", "l", [(g1x, mid(3))])),
    ("F8", "T4", "T5", "", route("T4", "b", "T5", "t")),
    ("F9", "T5", "T6", "", route("T5", "b", "T6", "t")),
    ("F10", "T6", "T7", "", route("T6", "r", "T7", "b", [(cx[5], mid(4))])),
    ("F11", "T7", "T8", "", route("T7", "t", "T8", "b")),
    ("F12", "T8", "G2", "", route("T8", "r", "G2", "l")),
    ("F13", "G2", "FimNegado", "Não", route("G2", "t", "FimNegado", "l", [(g2x, ROW_TOP0)])),
    ("F14", "G2", "Prazo1700", "Sim", route("G2", "r", "Prazo1700", "l")),
    ("F15", "Prazo1700", "T9", "", route("Prazo1700", "b", "T9", "t")),
    ("F16", "T9", "T10", "", route("T9", "r", "T10", "b", [(cx[8], mid(5))])),
    ("F17", "T10", "Fim", "", route("T10", "r", "Fim", "l")),
]

# rótulos de eventos e gateways: (x, y, alinhamento vertical) – abaixo do símbolo, como no Bizagi
def ev_label(n):
    kind, c, yc, _, _ = nodes[n]
    if n == "G1":
        return cx[c], yc - GW / 2 - 4, "bottom"
    if n in ("FimNegado", "Prazo1700"):
        return cx[c] + EV / 2 + 6, yc, "center_left"
    r = (GW if kind == "gateway" else EV) / 2
    return cx[c], yc + r + 4, "top"


flow_labels = {"F6": (port("G1", "r")[0] + 4, mid(2) - 5, "left", "bottom"),
               "F7": (g1x + 5, port("G1", "b")[1] + 3, "left", "top"),
               "F13": (g2x + 5, ROW_TOP0 + 22, "left", "center"),
               "F14": (port("G2", "r")[0] + 4, ROW_MAIN0 - 5, "left", "bottom")}

# ------------------------------------------------------------------ desenho no padrão Bizagi
WIDTH_CM = 24.0
S = WIDTH_CM / 2.54 * 72 / POOL_W      # pontos por px
LINE = "#3C3C3C"
TASK_EC, TASK_TOP, TASK_BOT = "#03689A", "#FFFFFF", "#D9E8F6"
START_EC, START_TOP, START_BOT = "#62A716", "#FFFFFF", "#D7F0A8"
END_EC, END_TOP, END_BOT = "#990000", "#FFFFFF", "#F2B8B8"
TMR_EC, TMR_TOP, TMR_BOT = "#4A79A8", "#FFFFFF", "#E1ECF7"
GW_EC, GW_TOP, GW_BOT = "#B39A00", "#FFFFFF", "#FFF2A0"


def fs(px):
    return px * S


def gradient(ax, patch, x, y, w, h, top, bot):
    c1 = np.array(matplotlib.colors.to_rgb(top))
    c2 = np.array(matplotlib.colors.to_rgb(bot))
    t = np.linspace(0, 1, 64)[:, None]
    img = (c1 * (1 - t) + c2 * t)[:, None, :].repeat(2, axis=1)
    im = ax.imshow(img, extent=(x, x + w, y + h, y), aspect="auto", zorder=patch.get_zorder() - 0.01,
                   interpolation="bilinear")
    im.set_clip_path(patch)


def draw():
    W_in = WIDTH_CM / 2.54
    fig = plt.figure(figsize=(W_in, W_in * POOL_H / POOL_W), dpi=300)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-1, POOL_W + 1)
    ax.set_ylim(POOL_H + 1, -1)
    ax.axis("off")
    lw = 0.9

    # piscina e raias
    ax.add_patch(Rectangle((0, 0), POOL_W, POOL_H, fc="white", ec=LINE, lw=lw, zorder=1))
    ax.plot([POOL_BAND] * 2, [0, POOL_H], color=LINE, lw=lw, zorder=2)
    ax.plot([POOL_BAND + LANE_BAND] * 2, [0, POOL_H], color=LINE, lw=lw * 0.8, zorder=2)
    ax.text(POOL_BAND / 2, POOL_H / 2, "Licença especial – processo proposto (TO-BE)", rotation=90,
            ha="center", va="center", fontsize=fs(13.5), fontweight="bold", color="#1A1A1A", zorder=3)
    for (label, _, _), (y0, h) in zip(lanes, lane_y):
        if y0:
            ax.plot([POOL_BAND, POOL_W], [y0, y0], color=LINE, lw=lw * 0.8, zorder=2)
        ax.text(POOL_BAND + LANE_BAND / 2, y0 + h / 2, label, rotation=90, ha="center", va="center",
                fontsize=fs(12), color="#1A1A1A", linespacing=1.05, zorder=3)

    # fluxos
    for fid, a, b, name, pts in flows:
        xs, ys = zip(*pts)
        ex, ey = pts[-1]
        px, py = pts[-2]
        ang = math.atan2(ey - py, ex - px)
        L = 9
        ax.plot(list(xs[:-1]) + [ex - L * 0.8 * math.cos(ang)], list(ys[:-1]) + [ey - L * 0.8 * math.sin(ang)],
                color=LINE, lw=lw, zorder=4, solid_joinstyle="miter")
        tip = [(ex, ey),
               (ex - L * math.cos(ang) + 3.6 * math.sin(ang), ey - L * math.sin(ang) - 3.6 * math.cos(ang)),
               (ex - L * math.cos(ang) - 3.6 * math.sin(ang), ey - L * math.sin(ang) + 3.6 * math.cos(ang))]
        ax.add_patch(Polygon(tip, closed=True, fc=LINE, ec=LINE, lw=0.4, zorder=4))
        if fid in flow_labels:
            lx, ly, ha, va = flow_labels[fid]
            ax.text(lx, ly, name, ha=ha, va=va, fontsize=fs(11), color="#1A1A1A", zorder=6)

    # elementos
    for n, (kind, c, yc, label, _) in nodes.items():
        x, y, w, h = box(n)
        xc = cx[c]
        if kind == "task":
            p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=7", fc="none", ec=TASK_EC,
                               lw=1.0, zorder=5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, TASK_TOP, TASK_BOT)
            ax.text(xc, yc, label, ha="center", va="center", fontsize=fs(12.5), color="#111111",
                    linespacing=1.12, zorder=6)
            continue
        if kind == "gateway":
            p = Polygon([(xc, y), (x + w, yc), (xc, y + h), (x, yc)], closed=True, fc="none", ec=GW_EC, lw=1.0,
                        zorder=5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, GW_TOP, GW_BOT)
            d = 7
            for s in (1, -1):
                ax.plot([xc - d, xc + d], [yc - s * d, yc + s * d], color="#5A4D00", lw=1.5, zorder=6,
                        solid_capstyle="round")
        else:
            ec, top, bot, lwe = {"start": (START_EC, START_TOP, START_BOT, 1.1),
                                 "end": (END_EC, END_TOP, END_BOT, 2.4),
                                 "timer": (TMR_EC, TMR_TOP, TMR_BOT, 0.9)}[kind]
            p = Circle((xc, yc), EV / 2, fc="none", ec=ec, lw=lwe, zorder=5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, top, bot)
            if kind == "timer":
                ax.add_patch(Circle((xc, yc), EV / 2 - 3, fc="none", ec=ec, lw=0.8, zorder=6))
                ax.add_patch(Circle((xc, yc), EV / 2 - 7.5, fc="white", ec="#333333", lw=0.8, zorder=6))
                for k in range(12):
                    a = k * math.pi / 6
                    r1, r2 = EV / 2 - 7.5, EV / 2 - 9.5
                    ax.plot([xc + r1 * math.cos(a), xc + r2 * math.cos(a)],
                            [yc + r1 * math.sin(a), yc + r2 * math.sin(a)], color="#333333", lw=0.5, zorder=7)
                ax.plot([xc, xc], [yc, yc - 6], color="#333333", lw=0.8, zorder=7)
                ax.plot([xc, xc + 4.5], [yc, yc + 1.5], color="#333333", lw=0.8, zorder=7)
        lx, ly, va = ev_label(n)
        ha = "left" if va == "center_left" else "center"
        ax.text(lx, ly, label, ha=ha, va="center" if va == "center_left" else va, fontsize=fs(11),
                color="#1A1A1A", linespacing=1.1, zorder=6)

    fig.savefig(OUT / "fig3_processo_proposto_bpmn.png", dpi=300, facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ BPMN 2.0 com diagrama (DI)
def lane_of(n):
    return nodes[n][4]


def bpmn():
    tag = {"start": "startEvent", "end": "endEvent", "timer": "intermediateCatchEvent",
           "gateway": "exclusiveGateway", "task": "task"}
    inc = {n: [] for n in nodes}
    out = {n: [] for n in nodes}
    for fid, a, b, _, _ in flows:
        out[a].append(fid)
        inc[b].append(fid)
    L = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" '
         'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
         'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
         'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
         'id="Definicoes_LicencaEspecial" targetNamespace="http://bpmn.io/schema/bpmn" '
         'exporter="bpmn_tobe.py" exporterVersion="1.0">',
         '  <collaboration id="Colaboracao_1">',
         '    <participant id="Piscina_1" name="Licença especial – processo proposto (TO-BE)" processRef="Processo_1"/>',
         '  </collaboration>',
         '  <process id="Processo_1" name="Licença especial (TO-BE)" isExecutable="false">',
         '    <laneSet id="Raias_1">']
    for i, (_, name, _) in enumerate(lanes):
        L.append(f'      <lane id="Raia_{i + 1}" name="{escape(name)}">')
        L += [f"        <flowNodeRef>{n}</flowNodeRef>" for n in nodes if lane_of(n) == i]
        L.append("      </lane>")
    L.append("    </laneSet>")
    for n, (kind, _, _, label, _) in nodes.items():
        name = escape(" ".join(label.split()))
        L.append(f'    <{tag[kind]} id="{n}" name="{name}">')
        L += [f"      <incoming>{f}</incoming>" for f in inc[n]]
        L += [f"      <outgoing>{f}</outgoing>" for f in out[n]]
        if kind == "timer":
            L.append(f'      <timerEventDefinition id="{n}_Def"/>')
        L.append(f"    </{tag[kind]}>")
    for fid, a, b, name, _ in flows:
        nm = f' name="{name}"' if name else ""
        L.append(f'    <sequenceFlow id="{fid}"{nm} sourceRef="{a}" targetRef="{b}"/>')
    L.append("  </process>")
    L.append('  <bpmndi:BPMNDiagram id="Diagrama_1" name="Processo proposto (TO-BE)">')
    L.append('    <bpmndi:BPMNPlane id="Plano_1" bpmnElement="Colaboracao_1">')

    def b_(x, y, w, h):
        return f'<dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}"/>'

    L.append(f'      <bpmndi:BPMNShape id="Piscina_1_di" bpmnElement="Piscina_1" isHorizontal="true">{b_(0, 0, POOL_W, POOL_H)}</bpmndi:BPMNShape>')
    for i, (y0, h) in enumerate(lane_y):
        L.append(f'      <bpmndi:BPMNShape id="Raia_{i + 1}_di" bpmnElement="Raia_{i + 1}" isHorizontal="true">'
                 f'{b_(POOL_BAND, y0, POOL_W - POOL_BAND, h)}</bpmndi:BPMNShape>')
    for n, (kind, _, _, label, _) in nodes.items():
        extra = ' isMarkerVisible="true"' if kind == "gateway" else ""
        lab = ""
        if kind != "task":
            lx, ly, va = ev_label(n)
            lw_, lh = 90, (24 if kind == "gateway" else 28)
            bx = lx if va == "center_left" else lx - lw_ / 2
            by = {"top": ly, "bottom": ly - lh}.get(va, ly - lh / 2)
            lab = f"<bpmndi:BPMNLabel>{b_(bx, by, lw_, lh)}</bpmndi:BPMNLabel>"
        L.append(f'      <bpmndi:BPMNShape id="{n}_di" bpmnElement="{n}"{extra}>{b_(*box(n))}{lab}</bpmndi:BPMNShape>')
    for fid, _, _, _, pts in flows:
        wps = "".join(f'<di:waypoint x="{x:.0f}" y="{y:.0f}"/>' for x, y in pts)
        L.append(f'      <bpmndi:BPMNEdge id="{fid}_di" bpmnElement="{fid}">{wps}</bpmndi:BPMNEdge>')
    L += ["    </bpmndi:BPMNPlane>", "  </bpmndi:BPMNDiagram>", "</definitions>", ""]
    (OUT / "Licenca_Especial_TO-BE.bpmn").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    draw()
    bpmn()
    print(f"piscina {POOL_W:.0f} x {POOL_H:.0f} px; proporção {POOL_W / POOL_H:.3f}")
