"""Figuras do trabalho ABNT (formato retrato, largura útil de 16 cm)."""
import textwrap

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Polygon

plt.rcParams["font.family"] = "DejaVu Sans"

NAVY = "#1F3864"
BLUE = "#2E75B6"
LBLUE = "#EAF1FB"
GREEN = "#4E7D32"
LGREEN = "#E8F2E1"
RED = "#B42318"
LRED = "#FDECEA"
GOLD = "#B7791F"
LGOLD = "#FFF6E0"
GREY = "#5F6B7A"
LINE = "#D5DCE6"

W = 6.3  # polegadas (16 cm)


def rbox(ax, x, y, w, h, text, fc, ec, fs=7, bold=False, tc="#1A1A1A", lw=1.1, ls="-"):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                                boxstyle="round,pad=0,rounding_size=0.06",
                                fc=fc, ec=ec, lw=lw, linestyle=ls, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=tc,
            fontweight="bold" if bold else "normal", linespacing=1.2, zorder=4)


def head(ax, x1, y1, x2, y2, color, size=0.07):
    """Ponta de seta em (x2, y2) apontando de (x1, y1)."""
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    p1 = (x2 - size * math.cos(ang) + size * 0.5 * math.sin(ang), y2 - size * math.sin(ang) - size * 0.5 * math.cos(ang))
    p2 = (x2 - size * math.cos(ang) - size * 0.5 * math.sin(ang), y2 - size * math.sin(ang) + size * 0.5 * math.cos(ang))
    ax.add_patch(Polygon([(x2, y2), p1, p2], closed=True, fc=color, ec=color, zorder=5))


def path(ax, pts, color=NAVY, lw=1.2, ls="-"):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=color, lw=lw, ls=ls, zorder=2, solid_capstyle="round")
    head(ax, pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1], color)


def save(fig, name):
    fig.savefig(name, dpi=300, bbox_inches="tight", pad_inches=0.04, facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ Figura 1
def fluxo_atual():
    fig, ax = plt.subplots(figsize=(W, 2.35))
    ax.set_xlim(0, 6.3)
    ax.set_ylim(0, 2.35)
    ax.axis("off")
    steps = [
        ("Aspirante\nconfecciona\na papeleta", "#F2F4F7", GREY, False),
        ("Assinatura 1\nComPel\n(Asp)", LBLUE, NAVY, True),
        ("Assinatura 2\nComCia\n(Asp)", LBLUE, NAVY, True),
        ("Assinatura 3\nEnc. de\nPapeleta (Asp)", LBLUE, NAVY, True),
        ("Assinatura 4\nComCia\n(Tenente)", LBLUE, NAVY, True),
        ("Licencia\n(a partir\ndas 17h)", LGREEN, GREEN, False),
    ]
    bw, bh, y = 0.86, 0.72, 1.75
    xs = [0.48 + i * 1.068 for i in range(6)]
    for i, ((t, fc, ec, b), x) in enumerate(zip(steps, xs)):
        rbox(ax, x, y, bw, bh, t, fc, ec, fs=5.9, bold=b)
        if i < 5:
            path(ax, [(x + bw / 2 + 0.02, y), (xs[i + 1] - bw / 2 - 0.03, y)])
    for x in xs[1:5]:
        rbox(ax, x, 0.92, bw, 0.42, "busca do\nassinante\n+ espera", LRED, RED, fs=5.6, tc=RED)
        path(ax, [(x, 1.13), (x, y - bh / 2 - 0.02)], color=RED, lw=0.9)
    # laço de retrabalho
    yl = 0.34
    path(ax, [(xs[4], 0.71), (xs[4], yl), (xs[1], yl), (xs[1], 0.69)], color=RED, lw=0.9, ls=(0, (3, 2)))
    ax.text((xs[1] + xs[4]) / 2, yl - 0.13, "retorno em outro horário", ha="center", fontsize=6, color=RED, style="italic")
    save(fig, "fig1_processo_atual.png")


# ------------------------------------------------------------------ SIPOC
def sipoc(fname, cols, processo):
    fig, ax = plt.subplots(figsize=(W, 5.6))
    ax.set_xlim(0, 6.3)
    ax.set_ylim(0, 5.6)
    ax.axis("off")
    heads = [("S", "Fornecedores"), ("I", "Entradas"), ("P", "Processo"), ("O", "Saídas"), ("C", "Clientes")]
    colors = [NAVY, BLUE, GOLD, GREEN, "#6B3FA0"]
    lights = ["#EEF2F8", LBLUE, LGOLD, LGREEN, "#F1EBF8"]
    cw, gap = 1.2, 0.075
    top = 5.55
    for i, (letter, name) in enumerate(heads):
        x = i * (cw + gap)
        ax.add_patch(FancyBboxPatch((x, top - 0.62), cw, 0.62, boxstyle="round,pad=0,rounding_size=0.06", fc=colors[i], ec=colors[i]))
        ax.text(x + cw / 2, top - 0.25, letter, ha="center", va="center", fontsize=15, color="white", fontweight="bold")
        ax.text(x + cw / 2, top - 0.5, name.upper(), ha="center", va="center", fontsize=6.3, color="white", fontweight="bold")
        ax.add_patch(FancyBboxPatch((x, 0.02), cw, top - 0.72, boxstyle="round,pad=0,rounding_size=0.06", fc=lights[i], ec=colors[i], lw=0.9))
        if i == 2:
            n = len(processo)
            area = top - 0.72 - 0.12
            sh = area / n
            for k, p in enumerate(processo):
                cy = top - 0.72 - 0.06 - sh * (k + 0.5)
                txt = "\n".join(textwrap.wrap(p, 17))
                rbox(ax, x + cw / 2, cy, cw - 0.14, sh - 0.14, txt, "white", colors[i], fs=6)
                if k < n - 1:
                    path(ax, [(x + cw / 2, cy - (sh - 0.14) / 2), (x + cw / 2, cy - sh + (sh - 0.14) / 2 + 0.01)], color=colors[i], lw=0.8)
        else:
            yy = top - 0.86
            for it in cols[i]:
                lines = textwrap.wrap(it, 16)
                ax.plot([x + 0.1], [yy - 0.055], marker="s", ms=2.6, color=colors[i])
                ax.text(x + 0.17, yy, "\n".join(lines), fontsize=5.9, va="top", linespacing=1.25)
                yy -= 0.125 * len(lines) + 0.17
    save(fig, fname)


def sipocs():
    sipoc("fig2_sipoc_atual.png", [
        ["Aspirante solicitante", "ComPel (Asp)", "ComCia (Asp)", "Encarregado de Papeleta (Asp)", "ComCia (Tenente)", "Setor que controla o saldo de licença especial"],
        ["Papeleta confeccionada pelo aspirante", "Dados do aspirante e do pedido", "Quatro assinaturas", "Controle de saldo de licença especial", "Conhecimento informal de impedimentos"],
        None,
        ["Papeleta assinada (autorização individual)", "Registro em papel da licença gozada", "Aspirante licenciado a partir das 17h", "Tempo livre consumido e interrupções dos oficiais"],
        ["Aspirante", "ComCia (Tenente)", "Polícia", "Comando do Corpo de Aspirantes"],
    ], ["1. Confeccionar a papeleta", "2. Assinatura do ComPel (Asp)", "3. Assinatura do ComCia (Asp)",
        "4. Assinatura do Encarregado de Papeleta", "5. Assinatura do ComCia (Tenente)", "6. Licenciar a partir das 17h"])
    sipoc("fig4_sipoc_proposto.png", [
        ["Aspirante solicitante", "Setor que concede a licença especial", "Escalante de serviço", "Setor disciplinar", "ComPel (Asp)", "Responsável pelo formulário e pela planilha"],
        ["Pedido eletrônico ou no Livro de Pedidos", "Saldo de licença por aspirante", "Escala de serviço do dia", "Relação de impedidos", "Vetos do ComPel, com motivo", "Norma interna do processo"],
        None,
        ["RDLE aprovada, uma por companhia", "Resultado ao aspirante: apto ou negado, com motivo", "Lista de controle da Polícia", "Registro de saída e regresso", "Saldo atualizado", "Indicadores do processo"],
        ["Aspirante", "ComCia (Tenente) e ComCia (Asp)", "Polícia e Oficial de Serviço", "Comando do Corpo de Aspirantes", "Setor que controla a licença especial"],
    ], ["1. Registrar o pedido até 12h30", "2. Consolidar e conferir saldo e impedimentos",
        "3. Ciência do ComPel com veto por exceção", "4. Validar (Asp) e aprovar em lote (Ten)",
        "5. Publicar a RDLE às 16h30", "6. Licenciar a partir das 17h e baixar o saldo"])


# ------------------------------------------------------------------ Figura 3 (raias verticais)
def fluxo_proposto():
    lanes = ["Aspirante", "Encarregado\nde Licenças", "ComPel\n(Asp)", "ComCia\n(Asp)", "ComCia\n(Tenente)", "Polícia"]
    times = ["até 12h30", "12h30–13h30", "até 14h00", "até 15h00", "até 16h00", "16h30", "a partir\ndas 17h00"]
    tw = 0.72
    lw_ = (W - tw) / len(lanes)
    hh = 0.48
    rh = 0.78
    H = hh + rh * len(times) + 0.05
    fig, ax = plt.subplots(figsize=(W, H))
    ax.set_xlim(0, W)
    ax.set_ylim(0, H)
    ax.axis("off")
    top = H - hh

    # cabeçalho
    ax.add_patch(Rectangle((0, top), W, hh, fc=NAVY, ec="none"))
    ax.text(tw / 2, top + hh / 2, "Horário", ha="center", va="center", color="white", fontsize=6.8, fontweight="bold")
    for j, l in enumerate(lanes):
        cx = tw + j * lw_ + lw_ / 2
        ax.text(cx, top + hh / 2, l, ha="center", va="center", color="white", fontsize=6.8, fontweight="bold", linespacing=1.1)
        if j:
            ax.plot([tw + j * lw_] * 2, [top + 0.08, top + hh - 0.08], color="#4A6391", lw=0.6)
    # raias
    for j in range(len(lanes)):
        ax.add_patch(Rectangle((tw + j * lw_, 0), lw_, top, fc=("#F7F9FC" if j % 2 == 0 else "white"), ec="none", zorder=0))
        ax.plot([tw + j * lw_] * 2, [0, top], color=LINE, lw=0.6, zorder=1)
    ax.plot([W, W], [0, top], color=LINE, lw=0.6)
    ax.plot([0, 0], [0, top], color=LINE, lw=0.6)
    ax.plot([0, W], [0, 0], color=LINE, lw=0.6)
    # linhas de horário
    for i, t in enumerate(times):
        yc = top - rh * (i + 0.5)
        ax.text(tw / 2, yc, t, ha="center", va="center", fontsize=6.3, color=GREY, fontweight="bold", linespacing=1.1)
        if i:
            ax.plot([0, W], [top - rh * i] * 2, color=LINE, lw=0.5, ls=(0, (2, 2)), zorder=1)
    y17 = top - rh * 6
    ax.plot([0, W], [y17, y17], color=GOLD, lw=1.3, zorder=2)
    ax.text(tw + 3 * lw_, y17 + 0.04, "17h00 · fim da rotina", ha="center", va="bottom", fontsize=5.8, color=GOLD, fontweight="bold")

    def c(lane, row):
        return tw + lane * lw_ + lw_ / 2, top - rh * (row + 0.5)

    bw, bh = lw_ - 0.08, rh - 0.2
    nodes = {
        "a0": (0, 0, "Registra o\npedido\n(≈ 2 min)", LGREEN, GREEN, "-"),
        "e1": (1, 1, "Consolida e\nconfere saldo e\nimpedimentos", LBLUE, BLUE, "-"),
        "p2": (2, 2, "Ciência;\nveto só por\nexceção", LGOLD, GOLD, (0, (3, 2))),
        "c3": (3, 3, "Valida a\nRDLE\n(visto único)", LBLUE, BLUE, "-"),
        "t4": (4, 4, "Aprova a\nRDLE\nem lote", LBLUE, BLUE, "-"),
        "e5": (1, 5, "Publica a\nRDLE e envia\nà Polícia", LBLUE, BLUE, "-"),
        "a5": (0, 5, "Consulta o\nresultado\n(apto/negado)", LGREEN, GREEN, "-"),
        "g6": (5, 6, "Confere RDLE\ne identidade;\nregistra saída", LBLUE, BLUE, "-"),
        "a6": (0, 6, "Licencia", GREEN, GREEN, "-"),
    }
    for k, (lane, row, t, fc, ec, ls) in nodes.items():
        x, y = c(lane, row)
        rbox(ax, x, y, bw, bh, t, fc, ec, fs=5.9, bold=(k == "a6"), tc=("white" if k == "a6" else "#1A1A1A"), ls=ls)

    def down_right(a, b, color=NAVY):
        xa, ya = c(nodes[a][0], nodes[a][1])
        xb, yb = c(nodes[b][0], nodes[b][1])
        ym = (ya - bh / 2 + yb + bh / 2) / 2
        path(ax, [(xa, ya - bh / 2), (xa, ym), (xb, ym), (xb, yb + bh / 2 + 0.005)], color=color)

    for a, b in [("a0", "e1"), ("e1", "p2"), ("p2", "c3"), ("c3", "t4"), ("t4", "e5")]:
        down_right(a, b)
    xe_, ye_ = c(1, 5)
    xg_, yg_ = c(5, 6)
    path(ax, [(xe_ + bw / 2, ye_), (xg_, ye_), (xg_, yg_ + bh / 2 + 0.005)])
    # e5 -> a5 (horizontal)
    xe, ye = c(1, 5)
    xa, ya = c(0, 5)
    path(ax, [(xe - bw / 2, ye), (xa + bw / 2 + 0.005, ya)])
    # a5 -> a6 (vertical)
    path(ax, [(xa, ya - bh / 2), (xa, c(0, 6)[1] + bh / 2 + 0.005)], color=GREEN)
    # g6 -> a6 (horizontal, liberação)
    xg, yg = c(5, 6)
    xa6, ya6 = c(0, 6)
    path(ax, [(xg - bw / 2, yg), (xa6 + bw / 2 + 0.005, ya6)], color=GREEN)
    ax.text((xg + xa6) / 2, yg + 0.05, "saída liberada", ha="center", va="bottom", fontsize=5.8, color=GREEN, style="italic")
    save(fig, "fig3_processo_proposto.png")


if __name__ == "__main__":
    fluxo_atual()
    sipocs()
    fluxo_proposto()
    print("ok")
