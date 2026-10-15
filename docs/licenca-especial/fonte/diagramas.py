import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle

plt.rcParams["font.family"] = "DejaVu Sans"

NAVY = "#1F3864"
BLUE = "#2E75B6"
LIGHT = "#DEEAF6"
RED = "#C00000"
LRED = "#FBE4E4"
GREEN = "#548235"
LGREEN = "#E2EFDA"
GREY = "#595959"
LGREY = "#F2F2F2"
GOLD = "#BF8F00"
LGOLD = "#FFF2CC"


def box(ax, x, y, w, h, text, fc=LIGHT, ec=NAVY, fs=10, bold=False, tc="black", lw=1.6, style="round,pad=0.02,rounding_size=0.08"):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle=style, fc=fc, ec=ec, lw=lw))
    ax.text(x, y, text, ha="center", va="center", fontsize=fs, color=tc,
            fontweight="bold" if bold else "normal", wrap=True, linespacing=1.25)


def arrow(ax, x1, y1, x2, y2, color=NAVY, lw=1.8, style="-|>", ls="-", rad=0.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=16,
                                 color=color, lw=lw, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}"))


# ---------------------------------------------------------------- AS-IS
def fluxo_atual():
    fig, ax = plt.subplots(figsize=(13.5, 4.55))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 5.3)
    ax.axis("off")

    ax.text(8, 4.95, "PROCESSO ATUAL (AS-IS): 4 assinaturas em série, em papel, no tempo livre do aspirante",
            ha="center", fontsize=13, fontweight="bold", color=NAVY)

    steps = [
        (1.2, "Aspirante\nretira a\npapeleta", LGREY, GREY),
        (3.6, "Assinatura 1\nComPel\n(Asp)", LIGHT, NAVY),
        (6.0, "Assinatura 2\nComCia\n(Asp)", LIGHT, NAVY),
        (8.4, "Assinatura 3\nEnc. de\nPapeleta (Asp)", LIGHT, NAVY),
        (10.8, "Assinatura 4\nComCia\n(Tenente)", LIGHT, NAVY),
        (13.2, "Entrega /\nregistro da\npapeleta", LGREY, GREY),
        (15.1, "Licencia\n(≥ 17h)", LGREEN, GREEN),
    ]
    y = 3.7
    for i, (x, t, fc, ec) in enumerate(steps):
        w = 1.75 if i < 6 else 1.3
        box(ax, x, y, w, 1.35, t, fc=fc, ec=ec, fs=8.4, bold=(i in (1, 2, 3, 4)))
        if i < len(steps) - 1:
            nx = steps[i + 1][0]
            nw = 1.75 if i + 1 < 6 else 1.3
            arrow(ax, x + w / 2 + 0.03, y, nx - nw / 2 - 0.03, y)

    # espera / deslocamento
    for x in (3.6, 6.0, 8.4, 10.8):
        box(ax, x, 2.25, 1.9, 0.75, "Procurar o assinante\n+ fila / espera", fc=LRED, ec=RED, fs=8, tc=RED)
        arrow(ax, x, 2.63, x, 3.02, color=RED, lw=1.2)

    # laço de retrabalho
    arrow(ax, 10.8, 1.87, 3.6, 1.87, color=RED, lw=1.6, ls="--", rad=-0.18)
    ax.text(7.2, 0.62,
            "Assinante indisponível, em aula/serviço ou papeleta com erro  →  retorno em outro horário (novo deslocamento)",
            ha="center", fontsize=9.5, color=RED, style="italic")
    ax.text(7.2, 0.22,
            "Cada assinatura pode consumir de 5 a 15 min (estimativa) do tempo livre diário do aspirante (≈ 2 h ± 1 h)",
            ha="center", fontsize=9.5, color=GREY)
    fig.savefig("fluxo_atual.png", dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------- TO-BE (swimlane)
def fluxo_proposto():
    lanes = [
        "Aspirante\n(solicitante)",
        "Encarregado de\nLicenças da Cia (Asp)",
        "ComPel (Asp)",
        "ComCia (Asp)",
        "ComCia (Tenente)",
        "Oficial de Serviço /\nPortaria",
    ]
    cols = ["Até 12h30\n(dia D ou antes)", "12h30 – 13h30", "Até 14h00", "Até 15h00", "Até 16h00", "16h30", "A partir\ndas 17h00"]
    n_l, n_c = len(lanes), len(cols)
    lane_h = 1.15
    col_w = 2.05
    x0 = 2.3
    top = n_l * lane_h
    fig, ax = plt.subplots(figsize=(14, 7.1))
    ax.set_xlim(0, x0 + n_c * col_w + 0.1)
    ax.set_ylim(-0.35, top + 1.35)
    ax.axis("off")

    ax.text((x0 + n_c * col_w) / 2 + 0.2, top + 1.05,
            "PROCESSO PROPOSTO (TO-BE): pedido digital único + Relação Diária de Licença Especial (RDLE) aprovada em lote",
            ha="center", fontsize=11.5, fontweight="bold", color=NAVY)

    # cabeçalho de colunas
    for j, c in enumerate(cols):
        cx = x0 + j * col_w
        ax.add_patch(Rectangle((cx, top), col_w, 0.62, fc=NAVY, ec="white", lw=1.5))
        ax.text(cx + col_w / 2, top + 0.31, c, ha="center", va="center", fontsize=8.2, color="white", fontweight="bold")
    ax.add_patch(Rectangle((0, top), x0, 0.62, fc=NAVY, ec="white", lw=1.5))
    ax.text(x0 / 2, top + 0.31, "Horário →", ha="center", va="center", fontsize=9.5, color="white", fontweight="bold")

    # raias
    for i, l in enumerate(lanes):
        y = top - (i + 1) * lane_h
        ax.add_patch(Rectangle((0, y), x0, lane_h, fc=LIGHT, ec="white", lw=1.5))
        ax.text(x0 / 2, y + lane_h / 2, l, ha="center", va="center", fontsize=8.6, fontweight="bold", color=NAVY)
        ax.add_patch(Rectangle((x0, y), n_c * col_w, lane_h, fc=(LGREY if i % 2 == 0 else "white"), ec="#D9D9D9", lw=0.8))
    # linha das 17h (fim da rotina)
    x17 = x0 + 6 * col_w
    ax.plot([x17, x17], [-0.05, top], color=GOLD, lw=2.2, ls="--")
    ax.text(x17 + 0.05, -0.25, "Fim da rotina — licença liberada", fontsize=8.5, color=GOLD, fontweight="bold")

    def pos(lane, col):
        return x0 + col * col_w + col_w / 2, top - (lane + 0.5) * lane_h

    bw, bh = col_w - 0.25, lane_h - 0.3
    nodes = {
        "a1": (0, 0, "Registra pedido\n(formulário/livro)\n≈ 2 min", LGREEN, GREEN),
        "e1": (1, 1, "Fecha a lista,\nconfere saldo e\nimpedimentos → RDLE", LIGHT, NAVY),
        "p1": (2, 2, "Ciência do pelotão;\nveto só por exceção\n(silêncio = acordo)", LGOLD, GOLD),
        "c1": (3, 3, "Valida a RDLE\n(1 visto por Cia)", LIGHT, NAVY),
        "t1": (4, 4, "Aprova a RDLE\nem lote\n(1 aprovação/dia)", LIGHT, NAVY),
        "e2": (1, 5, "Publica a RDLE;\nenvia ao Of. Serv.\ne à Portaria", LIGHT, NAVY),
        "a2": (0, 5, "Recebe\nconfirmação\n(APTO / NEGADO)", LGREEN, GREEN),
        "g1": (5, 6, "Confere RDLE +\nidentidade; registra\nsaída e regresso", LIGHT, NAVY),
        "a3": (0, 6, "LICENCIA", GREEN, GREEN),
    }
    for k, (lane, col, t, fc, ec) in nodes.items():
        x, y = pos(lane, col)
        box(ax, x, y, bw, bh, t, fc=fc, ec=ec, fs=7.4, bold=(k == "a3"), tc=("white" if k == "a3" else "black"))

    def link(a, b, **kw):
        la, ca = nodes[a][0], nodes[a][1]
        lb, cb = nodes[b][0], nodes[b][1]
        xa, ya = pos(la, ca)
        xb, yb = pos(lb, cb)
        if ca == cb:  # vertical
            s = 1 if yb < ya else -1
            arrow(ax, xa, ya - s * bh / 2, xb, yb + s * bh / 2, **kw)
        elif la == lb:
            arrow(ax, xa + bw / 2, ya, xb - bw / 2, yb, **kw)
        else:
            arrow(ax, xa + bw / 2, ya, xb - bw / 2, yb, **kw)

    link("a1", "e1")
    link("e1", "p1")
    link("p1", "c1")
    link("c1", "t1")
    link("t1", "e2")
    link("e2", "a2")
    link("e2", "g1")
    link("a2", "a3")
    xg, yg = pos(5, 6)
    xa3, ya3 = pos(0, 6)
    arrow(ax, xg, yg + bh / 2, xa3, ya3 - bh / 2, color=GREEN, lw=2.0)

    fig.savefig("fluxo_proposto.png", dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------- SIPOC
def sipoc(fname, titulo, dados, processo):
    fig, ax = plt.subplots(figsize=(13, 6.27))
    ax.set_xlim(0, 17)
    ax.set_ylim(0, 8.2)
    ax.axis("off")
    ax.text(8.5, 7.9, titulo, ha="center", fontsize=14, fontweight="bold", color=NAVY)
    heads = [("S", "FORNECEDORES", "Suppliers"), ("I", "ENTRADAS", "Inputs"), ("P", "PROCESSO", "Process"),
             ("O", "SAÍDAS", "Outputs"), ("C", "CLIENTES", "Customers")]
    colors = ["#1F3864", "#2E75B6", "#BF8F00", "#548235", "#7030A0"]
    lights = ["#D9E1F2", "#DEEAF6", "#FFF2CC", "#E2EFDA", "#EADCF4"]
    w, gap = 3.2, 0.2
    for i, (letter, name, en) in enumerate(heads):
        x = 0.1 + i * (w + gap)
        ax.add_patch(FancyBboxPatch((x, 6.35), w, 1.15, boxstyle="round,pad=0.02,rounding_size=0.1", fc=colors[i], ec=colors[i]))
        ax.text(x + 0.42, 6.93, letter, ha="center", va="center", fontsize=24, color="white", fontweight="bold")
        ax.text(x + 1.95, 7.08, name, ha="center", va="center", fontsize=10, color="white", fontweight="bold")
        ax.text(x + 1.95, 6.72, f"({en})", ha="center", va="center", fontsize=8.5, color="white", style="italic")
        ax.add_patch(FancyBboxPatch((x, 0.15), w, 6.05, boxstyle="round,pad=0.02,rounding_size=0.1", fc=lights[i], ec=colors[i], lw=1.4))
        if i < 4:
            arrow(ax, x + w + 0.01, 6.93, x + w + gap - 0.01, 6.93, color=GREY, lw=1.5)
        if i == 2:
            n = len(processo)
            step_h = 5.7 / n
            for k, p in enumerate(processo):
                cy = 6.0 - step_h * (k + 0.5)
                box(ax, x + w / 2, cy, w - 0.35, step_h - 0.2, p, fc="white", ec=colors[i], fs=7.8)
                if k < n - 1:
                    arrow(ax, x + w / 2, cy - (step_h - 0.2) / 2, x + w / 2, cy - step_h + (step_h - 0.2) / 2, color=colors[i], lw=1.3)
        else:
            items = dados[i]
            yy = 5.95
            for it in items:
                lines = it.count("\n") + 1
                ax.text(x + 0.18, yy, "▪", fontsize=10, color=colors[i], va="top")
                ax.text(x + 0.42, yy, it, fontsize=8.3, va="top", linespacing=1.25)
                yy -= 0.3 * lines + 0.22
    fig.savefig(fname, dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def sipocs():
    atual = [
        ["Aspirante solicitante", "Encarregado de Papeleta\n(fornece a papeleta)", "ComPel (Asp)", "ComCia (Asp)",
         "ComCia (Tenente)", "Setor que concede a LE\n(controle de saldo)"],
        ["Papeleta física em branco", "Dados do aspirante e\ndo pedido", "4 assinaturas", "Controle de licenças\nespeciais concedidas",
         "Conhecimento informal\nde impedimentos\n(serviço, punição etc.)"],
        None,
        ["Papeleta assinada\n(autorização individual)", "Registro em papel\nda licença gozada", "Aspirante licenciado\n(a partir das 17h)",
         "Efeito colateral: tempo\nlivre consumido e\ninterrupções dos oficiais"],
        ["Aspirante", "ComCia (Tenente)", "Oficial de Serviço /\nPortaria", "Comando do Corpo de\nAspirantes"],
    ]
    proc_atual = ["1. Retirar papeleta", "2. Assinatura do\nComPel (Asp)", "3. Assinatura do\nComCia (Asp)",
                  "4. Assinatura do Encarregado\nde Papeleta (Asp)", "5. Assinatura do\nComCia (Tenente)", "6. Licenciar às 17h"]
    sipoc("sipoc_atual.png", "DIAGRAMA SIPOC — PROCESSO ATUAL (AS-IS)", atual, proc_atual)

    novo = [
        ["Aspirante solicitante", "Setor que concede a LE\n(lança o saldo)", "Escalante de serviço\n(escala do dia)",
         "Setor disciplinar\n(punições/impedimentos)", "ComPel (Asp)\n(impedimentos do pel.)", "Responsável pelo\nformulário/planilha"],
        ["Pedido eletrônico (ou\nlinha no Livro de Pedidos)", "Saldo de LE por\naspirante", "Escala de serviço do dia",
         "Relação de impedidos", "Vetos por exceção\ndo ComPel", "Regras do processo\n(norma interna)"],
        None,
        ["RDLE aprovada\n(uma por companhia)", "Confirmação ao aspirante\n(APTO / NEGADO + motivo)", "Lista de controle da\nPortaria / Of. Serviço",
         "Registro de saída e\nregresso", "Saldo de LE atualizado", "Indicadores do processo"],
        ["Aspirante", "ComCia (Tenente)\ne ComCia (Asp)", "Oficial de Serviço /\nPortaria", "Comando do Corpo de\nAspirantes",
         "Setor que controla a LE"],
    ]
    proc_novo = ["1. Registrar pedido até 12h30", "2. Consolidar e conferir\n(saldo + impedimentos)",
                 "3. Ciência do ComPel\n(veto por exceção)", "4. Validar (ComCia Asp) e\naprovar em lote (Ten)",
                 "5. Publicar RDLE (16h30)", "6. Licenciar ≥ 17h e\nbaixar saldo"]
    sipoc("sipoc_proposto.png", "DIAGRAMA SIPOC — PROCESSO PROPOSTO (TO-BE)", novo, proc_novo)


# ---------------------------------------------------------------- linha do tempo
def linha_tempo():
    fig, ax = plt.subplots(figsize=(14, 3.55))
    ax.set_xlim(5.6, 23.6)
    ax.set_ylim(-0.4, 4.6)
    ax.axis("off")
    ax.text(14.6, 4.35, "LINHA DO TEMPO DO DIA D — o processo corre em paralelo à rotina, sem consumir o tempo livre",
            ha="center", fontsize=12.5, fontweight="bold", color=NAVY)
    # rotina
    ax.add_patch(Rectangle((6, 2.9), 11, 0.75, fc=LGREY, ec=GREY))
    ax.text(11.5, 3.27, "ROTINA (aulas, instrução, atividades) — licença NÃO pode ser gozada", ha="center", va="center", fontsize=10, color=GREY, fontweight="bold")
    ax.add_patch(Rectangle((17, 2.9), 6, 0.75, fc=LGREEN, ec=GREEN))
    ax.text(20, 3.27, "LICENÇA ESPECIAL LIBERADA", ha="center", va="center", fontsize=10, color=GREEN, fontweight="bold")

    bars = [
        (6.0, 12.5, 1.95, "Pedidos abertos (desde D-7 até 12h30)", GREEN, LGREEN),
        (12.5, 13.5, 1.15, "Enc. Licenças\nconsolida", NAVY, LIGHT),
        (13.5, 14.0, 1.95, "ComPel", GOLD, LGOLD),
        (14.0, 15.0, 1.15, "ComCia\n(Asp) valida", NAVY, LIGHT),
        (15.0, 16.0, 1.95, "ComCia\n(Ten) aprova", NAVY, LIGHT),
        (16.0, 16.5, 1.15, "Publica", GREEN, LGREEN),
    ]
    for a, b, y, t, ec, fc in bars:
        ax.add_patch(Rectangle((a, y - 0.32), b - a, 0.64, fc=fc, ec=ec, lw=1.4))
        if b - a >= 1:
            ax.text((a + b) / 2, y, t, ha="center", va="center", fontsize=7, color="black")
        else:
            ax.text((a + b) / 2, y, t, ha="center", va="center", fontsize=6.2, color="black")
    # eixo
    ax.plot([6, 23.2], [0.35, 0.35], color=GREY, lw=1.5)
    for h in range(6, 24):
        ax.plot([h, h], [0.27, 0.43], color=GREY, lw=1.2)
        ax.text(h, 0.0, f"{h:02d}h", ha="center", fontsize=8.5, color=GREY)
    ax.plot([17, 17], [0.35, 3.65], color=GOLD, lw=2, ls="--")
    ax.plot([12.5, 12.5], [0.35, 2.3], color=RED, lw=1.5, ls=":")
    ax.text(12.45, 0.55, "Corte 12h30", ha="right", fontsize=8.5, color=RED)
    ax.text(16.95, 0.55, "RDLE publicada 16h30", ha="right", fontsize=8.5, color=GREEN)
    fig.savefig("linha_tempo.png", dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(fig)


fluxo_atual()
fluxo_proposto()
sipocs()
linha_tempo()
print("ok")
