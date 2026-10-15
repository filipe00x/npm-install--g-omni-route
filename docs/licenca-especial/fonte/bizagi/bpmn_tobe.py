"""Figura 3 – processo proposto (TO-BE) em BPMN, no padrão visual do Bizagi Modeler.

Gera, a partir do mesmo modelo e das mesmas coordenadas:
  * fig3_processo_proposto_bpmn.png  (figura do trabalho)
  * Licenca_Especial_TO-BE.bpmn      (BPMN 2.0 com diagrama, importável no Bizagi Modeler:
                                      Exportar/Importar > Importar > BPMN)
As fases do topo (marcos do Bizagi) não existem no padrão BPMN 2.0 e só aparecem na figura.
"""
import math
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Circle, Ellipse, FancyBboxPatch, Polygon, Rectangle

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
plt.rcParams["font.family"] = "Liberation Sans"

# ------------------------------------------------------------------ geometria (px, y para baixo)
POOL_BAND, LANE_BAND, HDR = 32, 36, 46
X0 = POOL_BAND + LANE_BAND + 12
N, WD = 78, 132
TW, TH = 118, 72            # tarefa
EV, GW = 32, 42             # diâmetro do evento, diagonal do gateway
DSW, DSH = 46, 40           # repositório de dados

cols = [N, WD, WD, N + 22, WD, WD, N + 8, WD, WD, N]
cx, x = [], X0
for w in cols:
    cx.append(x + w / 2)
    x += w
POOL_W = x + 10
edges = [X0]
for w in cols:
    edges.append(edges[-1] + w)

# raias ordenadas para encurtar os fluxos: o Polícia fica junto do aspirante
lanes = [("Aspirante", "Aspirante", 140), ("Polícia", "Polícia", 100),
         ("Encarregado\nde Licenças", "Encarregado de Licenças", 116), ("ComPel (Asp)", "ComPel (Asp)", 106),
         ("ComCia (Asp)", "ComCia (Asp)", 100), ("ComCia\n(Tenente)", "ComCia (Tenente)", 100)]
ASP, POL, ENC, CPEL, CCIA, TEN = range(6)
lane_y, y = [], HDR
for _, _, h in lanes:
    lane_y.append((y, h))
    y += h
POOL_H = y

# fases do dia (marcos do Bizagi): (título, horário, primeira coluna, última coluna)
phases = [("Pedido", "até 12h30", 0, 1), ("Conferência e aprovação", "12h30 às 16h00", 2, 4),
          ("Publicação", "16h30", 5, 5), ("Saída", "a partir das 17h00", 6, 7),
          ("Fechamento", "dia seguinte", 8, 9)]


def mid(lane):
    y0, h = lane_y[lane]
    return y0 + h / 2


ROW_MAIN0 = lane_y[ASP][0] + 90
ROW_TOP0 = lane_y[ASP][0] + 32
ROW_ENC = lane_y[ENC][0] + 50

# id: (tipo, coluna, y, rótulo, prazo, raia)
nodes = {
    "Inicio": ("start", 0, ROW_MAIN0, "Licença especial\ndesejada", "", ASP),
    "T1": ("user", 1, ROW_MAIN0, "Registrar\no pedido", "até 12h30", ASP),
    "Prazo1230": ("timer", 1, ROW_ENC, "12h30", "", ENC),
    "T2": ("user", 2, ROW_ENC, "Consolidar\ne conferir\nos pedidos", "até 13h30", ENC),
    "T3": ("user", 2, mid(CPEL), "Tomar\nciência da\nrelação", "até 14h00", CPEL),
    "G1": ("gateway", 3, mid(CPEL), "Há\nimpedimento?", "", CPEL),
    "T4": ("user", 4, mid(CPEL), "Registrar\no veto, com\nmotivo", "", CPEL),
    "T5": ("user", 4, mid(CCIA), "Revisar\na RDLE e dar\no visto", "até 15h00", CCIA),
    "T6": ("user", 4, mid(TEN), "Aprovar\na RDLE em lote", "até 16h00", TEN),
    "T7": ("send", 5, ROW_ENC, "Publicar\na RDLE e enviar\nao Polícia", "16h30", ENC),
    "T8": ("user", 5, ROW_MAIN0, "Consultar\no resultado", "", ASP),
    "G2": ("gateway", 6, ROW_MAIN0, "Pedido\naprovado?", "", ASP),
    "FimNegado": ("end", 7, ROW_TOP0, "Pedido negado,\ncom motivo", "", ASP),
    "Prazo1700": ("timer", 7, ROW_MAIN0, "17h00", "", ASP),
    "T9": ("user", 7, mid(POL), "Conferir\na identidade e\nregistrar a saída", "", POL),
    "T10": ("user", 8, ROW_ENC, "Baixar\no saldo e os\nindicadores", "até 08h00", ENC),
    "Fim": ("end", 9, ROW_ENC, "Licença\nregistrada", "", ENC),
}
stores = {"Planilha1": (3, ROW_ENC, "Planilha de\ncontrole"), "Planilha2": (7, ROW_ENC, "Planilha de\ncontrole")}


def box(n):
    if n in stores:
        c, yc, _ = stores[n]
        return cx[c] - DSW / 2, yc - DSH / 2, DSW, DSH
    kind, c, yc = nodes[n][:3]
    if kind in ("user", "send"):
        return cx[c] - TW / 2, yc - TH / 2, TW, TH
    if kind == "gateway":
        return cx[c] - GW / 2, yc - GW / 2, GW, GW
    return cx[c] - EV / 2, yc - EV / 2, EV, EV


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
    ("F7", "G1", "T5", "Não", route("G1", "b", "T5", "l", [(g1x, mid(CCIA))])),
    ("F8", "T4", "T5", "", route("T4", "b", "T5", "t")),
    ("F9", "T5", "T6", "", route("T5", "b", "T6", "t")),
    ("F10", "T6", "T7", "", route("T6", "r", "T7", "b", [(cx[5], mid(TEN))])),
    ("F11", "T7", "T8", "", route("T7", "t", "T8", "b")),
    ("F12", "T8", "G2", "", route("T8", "r", "G2", "l")),
    ("F13", "G2", "FimNegado", "Não", route("G2", "t", "FimNegado", "l", [(g2x, ROW_TOP0)])),
    ("F14", "G2", "Prazo1700", "Sim", route("G2", "r", "Prazo1700", "l")),
    ("F15", "Prazo1700", "T9", "", route("Prazo1700", "b", "T9", "t")),
    ("F16", "T9", "T10", "", route("T9", "r", "T10", "t", [(cx[8], mid(POL))])),
    ("F17", "T10", "Fim", "", route("T10", "r", "Fim", "l")),
]
DEFAULT_FLOW = {"G1": "F7"}                      # silêncio do ComPel = concordância
assocs = [("A1", "T2", "Planilha1", route("T2", "r", "Planilha1", "l")),
          ("A2", "T10", "Planilha2", route("T10", "l", "Planilha2", "r"))]


def ev_label(n):
    """Rótulo de evento/gateway: (x, y, ha, va)."""
    if n in stores:
        c, yc, _ = stores[n]
        return cx[c], yc + DSH / 2 + 3, "center", "top"
    kind, c, yc = nodes[n][:3]
    if n == "G1":
        return cx[c], yc - GW / 2 - 3, "center", "bottom"
    if n in ("FimNegado", "Prazo1700"):
        return cx[c] + EV / 2 + 6, yc, "left", "center"
    r = (GW if kind == "gateway" else EV) / 2
    return cx[c], yc + r + 3, "center", "top"


flow_labels = {"F6": (port("G1", "r")[0] + 3, mid(CPEL) - 4, "left", "bottom"),
               "F7": (g1x + 6, port("G1", "b")[1] + 13, "left", "top"),
               "F13": (g2x + 5, ROW_TOP0 + 20, "left", "center"),
               "F14": (port("G2", "r")[0] + 4, ROW_MAIN0 - 4, "left", "bottom")}

# ------------------------------------------------------------------ desenho no padrão Bizagi
WIDTH_CM = 24.0
S = WIDTH_CM / 2.54 * 72 / POOL_W      # pontos por px
INK = "#1E1E1E"
LINE = "#3C3C3C"
SEP = "#9AA7B6"
BAND = "#F3F6FA"
HEAD = "#E6EDF6"
TASK_EC, TASK_TOP, TASK_BOT = "#03689A", "#FFFFFF", "#D6E6F5"
START_EC, START_TOP, START_BOT = "#62A716", "#FFFFFF", "#D3EFA0"
END_EC, END_TOP, END_BOT = "#990000", "#FFFFFF", "#F0B4B4"
TMR_EC, TMR_TOP, TMR_BOT = "#3F6E9E", "#FFFFFF", "#DDE9F6"
GW_EC, GW_TOP, GW_BOT = "#B39A00", "#FFFFFF", "#FFF0A0"
DS_EC, DS_TOP, DS_BOT = "#6B7785", "#FFFFFF", "#E3E8EE"
DUE = "#03689A"


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


def shadow(ax, patch_factory):
    sh = patch_factory(2.2, 2.6)
    sh.set_facecolor((0, 0, 0, 0.13))
    sh.set_edgecolor("none")
    sh.set_zorder(4.4)
    ax.add_patch(sh)


def arrow(ax, pts, color=LINE, lw=0.9, dashed=False, open_head=False):
    ex, ey = pts[-1]
    px, py = pts[-2]
    ang = math.atan2(ey - py, ex - px)
    L, Wd = 9, 3.6
    stop = L * (0.15 if open_head else 0.8)
    xs = [p[0] for p in pts[:-1]] + [ex - stop * math.cos(ang)]
    ys = [p[1] for p in pts[:-1]] + [ey - stop * math.sin(ang)]
    ax.plot(xs, ys, color=color, lw=lw, zorder=4, solid_joinstyle="miter",
            linestyle=(0, (1.2, 2.2)) if dashed else "-")
    tip = [(ex - L * math.cos(ang) + Wd * math.sin(ang), ey - L * math.sin(ang) - Wd * math.cos(ang)), (ex, ey),
           (ex - L * math.cos(ang) - Wd * math.sin(ang), ey - L * math.sin(ang) + Wd * math.cos(ang))]
    if open_head:
        ax.plot(*zip(*tip), color=color, lw=lw, zorder=4, solid_joinstyle="miter")
    else:
        ax.add_patch(Polygon(tip, closed=True, fc=color, ec=color, lw=0.4, zorder=4))


def user_icon(ax, x, y):
    """Ícone de tarefa de usuário (BPMN), canto superior esquerdo em (x, y)."""
    ax.add_patch(Ellipse((x + 7, y + 13.2), 13, 9, fc="white", ec=INK, lw=0.6, zorder=7))
    ax.add_patch(Rectangle((x, y + 13.2), 14, 5, fc="white", ec="none", zorder=7.05))
    ax.plot([x + 0.5, x + 0.5, x + 13.5, x + 13.5], [y + 13.4, y + 17.8, y + 17.8, y + 13.4], color=INK, lw=0.6,
            zorder=7.1)
    ax.add_patch(Circle((x + 7, y + 5.6), 3.6, fc="white", ec=INK, lw=0.6, zorder=7.2))
    ax.add_patch(Polygon([(x + 3.3, y + 5.2), (x + 4.2, y + 2.4), (x + 7, y + 1.7), (x + 9.8, y + 2.4),
                          (x + 10.7, y + 5.2), (x + 8.6, y + 3.9), (x + 5.4, y + 3.9)], closed=True, fc=INK,
                         ec=INK, lw=0.3, zorder=7.3))


def send_icon(ax, x, y):
    """Ícone de tarefa de envio (envelope cheio)."""
    ax.add_patch(Rectangle((x, y + 2), 16, 11, fc=INK, ec=INK, lw=0.5, zorder=7))
    ax.plot([x + 0.4, x + 8, x + 15.6], [y + 2.6, y + 8.4, y + 2.6], color="white", lw=0.8, zorder=7.1)


def draw():
    W_in = WIDTH_CM / 2.54
    fig = plt.figure(figsize=(W_in, W_in * POOL_H / POOL_W), dpi=300)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-1, POOL_W + 1)
    ax.set_ylim(POOL_H + 1, -1)
    ax.axis("off")
    lw = 0.9
    xl = POOL_BAND + LANE_BAND

    # piscina, faixas de título e fases
    ax.add_patch(Rectangle((0, 0), POOL_W, POOL_H, fc="white", ec="none", zorder=0.5))
    ax.add_patch(Rectangle((0, 0), POOL_BAND, POOL_H, fc=HEAD, ec="none", zorder=0.6))
    ax.add_patch(Rectangle((POOL_BAND, HDR), LANE_BAND, POOL_H - HDR, fc=BAND, ec="none", zorder=0.6))
    ax.add_patch(Rectangle((POOL_BAND, 0), POOL_W - POOL_BAND, HDR, fc=HEAD, ec="none", zorder=0.6))
    ax.text(POOL_BAND / 2, POOL_H / 2, "Licença especial – processo proposto (TO-BE)", rotation=90,
            ha="center", va="center", fontsize=fs(13.5), fontweight="bold", color="#16324F", zorder=3)
    ax.text(POOL_BAND + LANE_BAND / 2, HDR / 2, "Fases", rotation=90, ha="center", va="center",
            fontsize=fs(10.5), color="#4A5B6D", zorder=3)
    for title, hora, c1, c2 in phases:
        a, b = edges[c1], edges[c2 + 1]
        if c1 == 0:
            a = xl
        if c2 == len(cols) - 1:
            b = POOL_W
        ax.text((a + b) / 2, HDR / 2 - 7, title, ha="center", va="center", fontsize=fs(12.5),
                fontweight="bold", color="#16324F", zorder=3)
        ax.text((a + b) / 2, HDR / 2 + 9, hora, ha="center", va="center", fontsize=fs(11), color="#3F5872",
                zorder=3)
        if c1:
            ax.plot([a, a], [0, HDR], color=SEP, lw=0.8, zorder=2)
            ax.plot([a, a], [HDR, POOL_H], color=SEP, lw=0.7, ls=(0, (4, 3)), zorder=1)
    ax.plot([xl, xl], [0, HDR], color=SEP, lw=0.8, zorder=2)
    for (label, _, _), (y0, h) in zip(lanes, lane_y):
        ax.plot([POOL_BAND, POOL_W], [y0, y0], color=LINE, lw=lw * 0.8, zorder=2)
        ax.text(POOL_BAND + LANE_BAND / 2, y0 + h / 2, label, rotation=90, ha="center", va="center",
                fontsize=fs(12), color=INK, linespacing=1.05, zorder=3)
    ax.plot([POOL_BAND] * 2, [0, POOL_H], color=LINE, lw=lw, zorder=2)
    ax.plot([xl] * 2, [HDR, POOL_H], color=LINE, lw=lw * 0.8, zorder=2)
    ax.add_patch(Rectangle((0, 0), POOL_W, POOL_H, fc="none", ec=LINE, lw=1.1, zorder=8))

    # fluxos de sequência e associações de dados
    for fid, a, b, name, pts in flows:
        arrow(ax, pts)
        if fid in flow_labels:
            lx, ly, ha, va = flow_labels[fid]
            ax.text(lx, ly, name, ha=ha, va=va, fontsize=fs(11), color=INK, zorder=6)
    gx, gy = port("G1", "b")
    ax.plot([gx - 5, gx + 5], [gy + 10, gy + 4], color=LINE, lw=1.0, zorder=4)   # marca de fluxo padrão
    for _, _, _, pts in assocs:
        arrow(ax, pts, color="#55606C", lw=0.85, dashed=True, open_head=True)

    texts = []
    # repositórios de dados
    for n, (c, yc, label) in stores.items():
        x, y, w, h = box(n)
        e = 6
        body = lambda dx=0, dy=0: Polygon(
            [(x + dx, y + e / 2 + dy)] + [(x + w / 2 + dx + w / 2 * math.cos(t), y + e / 2 + dy - e / 2 * math.sin(t))
                                       for t in np.linspace(math.pi, 0, 30)]
            + [(x + w + dx, y + h - e / 2 + dy)]
            + [(x + w / 2 + dx + w / 2 * math.cos(t), y + h - e / 2 + dy + e / 2 * math.sin(t))
               for t in np.linspace(0, math.pi, 30)], closed=True)
        shadow(ax, lambda dx, dy: body(dx, dy))
        p = body()
        p.set_facecolor("none"); p.set_edgecolor(DS_EC); p.set_linewidth(0.9); p.set_zorder(5)
        ax.add_patch(p)
        gradient(ax, p, x, y, w, h, DS_TOP, DS_BOT)
        ax.add_patch(Ellipse((x + w / 2, y + e / 2), w, e, fc="#F7F9FB", ec=DS_EC, lw=0.9, zorder=5.2))
        for k in (1, 2):
            ts = np.linspace(math.pi, 0, 30)
            ax.plot(x + w / 2 + w / 2 * np.cos(ts), y + e / 2 + 3.2 * k + e / 2 * np.sin(ts),
                    color=DS_EC, lw=0.5, zorder=5.3)
        lx, ly, ha, va = ev_label(n)
        ax.text(lx, ly, label, ha=ha, va=va, fontsize=fs(10.5), color="#3D4752", linespacing=1.05, zorder=6)

    # objetos de fluxo
    for n, (kind, c, yc, label, due, _) in nodes.items():
        x, y, w, h = box(n)
        xc = cx[c]
        if kind in ("user", "send"):
            mk = lambda dx=0, dy=0: FancyBboxPatch((x + dx, y + dy), w, h, boxstyle="round,pad=0,rounding_size=8")
            shadow(ax, mk)
            p = mk()
            p.set_facecolor("none"); p.set_edgecolor(TASK_EC); p.set_linewidth(1.1); p.set_zorder(5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, TASK_TOP, TASK_BOT)
            (user_icon if kind == "user" else send_icon)(ax, x + 6, y + 5)
            nl = label.count("\n") + 1
            lh = 15.2
            block = nl * lh + (13 if due else 0)
            top = yc - block / 2 + 3
            t = ax.text(xc, top, label, ha="center", va="top", fontsize=fs(12.8), color="#111111",
                        linespacing=1.08, zorder=6)
            texts.append((n, t, (x, y, w, h)))
            if due:
                d = ax.text(xc, top + nl * lh + 1, due, ha="center", va="top", fontsize=fs(11), color=DUE,
                            fontweight="bold", zorder=6)
                texts.append((n, d, (x, y, w, h)))
            continue
        if kind == "gateway":
            mk = lambda dx=0, dy=0: Polygon([(xc + dx, y + dy), (x + w + dx, yc + dy), (xc + dx, y + h + dy),
                                             (x + dx, yc + dy)], closed=True)
            shadow(ax, mk)
            p = mk()
            p.set_facecolor("none"); p.set_edgecolor(GW_EC); p.set_linewidth(1.1); p.set_zorder(5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, GW_TOP, GW_BOT)
            d = 7
            for s in (1, -1):
                ax.plot([xc - d, xc + d], [yc - s * d, yc + s * d], color="#5A4D00", lw=1.6, zorder=6,
                        solid_capstyle="round")
        else:
            ec, top_c, bot_c, lwe = {"start": (START_EC, START_TOP, START_BOT, 1.2),
                                     "end": (END_EC, END_TOP, END_BOT, 2.6),
                                     "timer": (TMR_EC, TMR_TOP, TMR_BOT, 1.0)}[kind]
            shadow(ax, lambda dx, dy: Circle((xc + dx, yc + dy), EV / 2))
            p = Circle((xc, yc), EV / 2, fc="none", ec=ec, lw=lwe, zorder=5)
            ax.add_patch(p)
            gradient(ax, p, x, y, w, h, top_c, bot_c)
            if kind == "timer":
                ax.add_patch(Circle((xc, yc), EV / 2 - 3, fc="none", ec=ec, lw=0.9, zorder=6))
                ax.add_patch(Circle((xc, yc), EV / 2 - 7.5, fc="white", ec="#333333", lw=0.8, zorder=6))
                for k in range(12):
                    a = k * math.pi / 6
                    r1, r2 = EV / 2 - 7.5, EV / 2 - 9.5
                    ax.plot([xc + r1 * math.cos(a), xc + r2 * math.cos(a)],
                            [yc + r1 * math.sin(a), yc + r2 * math.sin(a)], color="#333333", lw=0.5, zorder=7)
                ax.plot([xc, xc], [yc, yc - 6], color="#333333", lw=0.8, zorder=7)
                ax.plot([xc, xc + 4.5], [yc, yc + 1.5], color="#333333", lw=0.8, zorder=7)
        lx, ly, ha, va = ev_label(n)
        bold = n in ("Prazo1230", "Prazo1700")
        ax.text(lx, ly, label, ha=ha, va=va, fontsize=fs(11.5 if bold else 11), color=DUE if bold else INK,
                fontweight="bold" if bold else "normal", linespacing=1.08, zorder=6)

    # conferência: nenhum texto pode vazar da sua tarefa
    fig.canvas.draw()
    rend = fig.canvas.get_renderer()
    inv = ax.transData.inverted()
    for n, t, (x, y, w, h) in texts:
        bb = t.get_window_extent(rend)
        (x0, y1), (x1, y0) = inv.transform([(bb.x0, bb.y0), (bb.x1, bb.y1)])
        assert x0 > x + 3 and x1 < x + w - 3 and y0 > y + 2 and y1 < y + h - 2, (n, x0, x1, y0, y1)
        if t.get_text() == nodes[n][3]:
            # a primeira linha não pode encostar no ícone do canto (x+6..x+22, y+5..y+23)
            tmp = ax.text(*t.get_position(), t.get_text().split("\n")[0], ha="center", va="top",
                          fontsize=t.get_fontsize())
            fb = tmp.get_window_extent(rend)
            tmp.remove()
            (fx0, _), _ = inv.transform([(fb.x0, fb.y0), (fb.x1, fb.y1)])
            assert fx0 > x + 24 or y0 > y + 23, (n, "ícone", fx0 - x)

    fig.savefig(OUT / "fig3_processo_proposto_bpmn.png", dpi=300, facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ BPMN 2.0 com diagrama (DI)
def bpmn():
    tag = {"start": "startEvent", "end": "endEvent", "timer": "intermediateCatchEvent",
           "gateway": "exclusiveGateway", "user": "userTask", "send": "sendTask"}
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
         'exporter="bpmn_tobe.py" exporterVersion="2.0">',
         '  <collaboration id="Colaboracao_1">',
         '    <participant id="Piscina_1" name="Licença especial – processo proposto (TO-BE)" processRef="Processo_1"/>',
         '  </collaboration>',
         '  <dataStore id="Planilha" name="Planilha de controle"/>',
         '  <process id="Processo_1" name="Licença especial (TO-BE)" isExecutable="false">',
         '    <laneSet id="Raias_1">']
    for i, (_, name, _) in enumerate(lanes):
        L.append(f'      <lane id="Raia_{i + 1}" name="{escape(name)}">')
        L += [f"        <flowNodeRef>{n}</flowNodeRef>" for n in nodes if nodes[n][5] == i]
        L.append("      </lane>")
    L.append("    </laneSet>")
    for n, (kind, _, _, label, due, _) in nodes.items():
        name = " ".join(label.split()) + (f" ({due})" if due else "")
        dflt = f' default="{DEFAULT_FLOW[n]}"' if n in DEFAULT_FLOW else ""
        L.append(f'    <{tag[kind]} id="{n}" name="{escape(name)}"{dflt}>')
        L += [f"      <incoming>{f}</incoming>" for f in inc[n]]
        L += [f"      <outgoing>{f}</outgoing>" for f in out[n]]
        for aid, src, dst, _ in assocs:
            if src == n:
                L.append(f'      <dataOutputAssociation id="{aid}"><targetRef>{dst}</targetRef></dataOutputAssociation>')
        if kind == "timer":
            L.append(f'      <timerEventDefinition id="{n}_Def"/>')
        L.append(f"    </{tag[kind]}>")
    for n, (_, _, label) in stores.items():
        L.append(f'    <dataStoreReference id="{n}" name="{escape(" ".join(label.split()))}" dataStoreRef="Planilha"/>')
    for fid, a, b, name, _ in flows:
        nm = f' name="{name}"' if name else ""
        L.append(f'    <sequenceFlow id="{fid}"{nm} sourceRef="{a}" targetRef="{b}"/>')
    L.append("  </process>")
    L.append('  <bpmndi:BPMNDiagram id="Diagrama_1" name="Processo proposto (TO-BE)">')
    L.append('    <bpmndi:BPMNPlane id="Plano_1" bpmnElement="Colaboracao_1">')

    def b_(x, y, w, h):
        return f'<dc:Bounds x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}"/>'

    def lab(n):
        lx, ly, ha, va = ev_label(n)
        lw_, lh = 90, (24 if n.startswith("G") else 28)
        bx = lx if ha == "left" else lx - lw_ / 2
        by = {"top": ly, "bottom": ly - lh}.get(va, ly - lh / 2)
        return f"<bpmndi:BPMNLabel>{b_(bx, by, lw_, lh)}</bpmndi:BPMNLabel>"

    L.append(f'      <bpmndi:BPMNShape id="Piscina_1_di" bpmnElement="Piscina_1" isHorizontal="true">{b_(0, HDR, POOL_W, POOL_H - HDR)}</bpmndi:BPMNShape>')
    for i, (y0, h) in enumerate(lane_y):
        L.append(f'      <bpmndi:BPMNShape id="Raia_{i + 1}_di" bpmnElement="Raia_{i + 1}" isHorizontal="true">'
                 f'{b_(POOL_BAND, y0, POOL_W - POOL_BAND, h)}</bpmndi:BPMNShape>')
    for n, (kind, *_rest) in nodes.items():
        extra = ' isMarkerVisible="true"' if kind == "gateway" else ""
        L.append(f'      <bpmndi:BPMNShape id="{n}_di" bpmnElement="{n}"{extra}>{b_(*box(n))}'
                 f'{"" if kind in ("user", "send") else lab(n)}</bpmndi:BPMNShape>')
    for n in stores:
        L.append(f'      <bpmndi:BPMNShape id="{n}_di" bpmnElement="{n}">{b_(*box(n))}{lab(n)}</bpmndi:BPMNShape>')
    for fid, _, _, _, pts in flows:
        wps = "".join(f'<di:waypoint x="{x:.0f}" y="{y:.0f}"/>' for x, y in pts)
        L.append(f'      <bpmndi:BPMNEdge id="{fid}_di" bpmnElement="{fid}">{wps}</bpmndi:BPMNEdge>')
    for aid, _, _, pts in assocs:
        wps = "".join(f'<di:waypoint x="{x:.0f}" y="{y:.0f}"/>' for x, y in pts)
        L.append(f'      <bpmndi:BPMNEdge id="{aid}_di" bpmnElement="{aid}">{wps}</bpmndi:BPMNEdge>')
    L += ["    </bpmndi:BPMNPlane>", "  </bpmndi:BPMNDiagram>", "</definitions>", ""]
    (OUT / "Licenca_Especial_TO-BE.bpmn").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    draw()
    bpmn()
    print(f"piscina {POOL_W:.0f} x {POOL_H:.0f} px; proporção {POOL_W / POOL_H:.3f}; "
          f"altura a 24 cm: {24 * POOL_H / POOL_W:.2f} cm")
