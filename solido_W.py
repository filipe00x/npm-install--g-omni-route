"""Esboço do sólido W = {(x, y, z) : 0 <= x <= 1, 0 <= y <= 1, 0 <= z <= 2 - y}.

Gera solido_W.png com duas vistas:
  (1) o sólido em R^3, com as seis faces da fronteira;
  (2) a seção transversal (trapézio) no plano yz, que é a base do prisma.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Patch, Polygon
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# Vértices do sólido
A = (0, 0, 0)
B = (1, 0, 0)
C = (1, 1, 0)
D = (0, 1, 0)
E = (0, 0, 2)
F = (1, 0, 2)
G = (1, 1, 1)
H = (0, 1, 1)

faces = [
    ([A, B, C, D], "#9ecae1", r"Base: $z = 0$"),
    ([E, F, G, H], "#fdae6b", r"Topo: $z = 2 - y$"),
    ([A, D, H, E], "#c7e9c0", r"Esquerda: $x = 0$"),
    ([B, C, G, F], "#74c476", r"Direita: $x = 1$"),
    ([A, B, F, E], "#dadaeb", r"Traseira: $y = 0$"),
    ([D, C, G, H], "#9e9ac8", r"Frontal: $y = 1$"),
]
hidden_faces = {0, 2, 4}  # z=0, x=0, y=0 ficam atrás nesta vista

# Para a vista escolhida (elev=22, azim=28) as faces x=0, y=0 e z=0 ficam
# escondidas; as arestas comuns a duas delas são desenhadas tracejadas.
hidden_edges = [(A, B), (A, D), (A, E)]
visible_edges = [
    (B, C), (C, D), (B, F), (C, G), (D, H),
    (E, F), (F, G), (G, H), (H, E),
]

fig = plt.figure(figsize=(14, 6.4))

# ---------------------------------------------------------------- vista 3D
ax = fig.add_subplot(1, 2, 1, projection="3d")
ax.view_init(elev=22, azim=28)
ax.computed_zorder = False  # desenha na ordem dada: faces, arestas, rótulos

order = sorted(range(len(faces)), key=lambda i: i not in hidden_faces)
for i in order:
    verts, color, _ = faces[i]
    alpha = 0.3 if i in hidden_faces else 0.6
    poly = Poly3DCollection([verts], facecolor=color, edgecolor="none",
                            alpha=alpha, zorder=1)
    ax.add_collection3d(poly)

for p, q in hidden_edges:
    ax.plot(*zip(p, q), color="black", lw=1.2, ls="--", zorder=2)
for p, q in visible_edges:
    ax.plot(*zip(p, q), color="black", lw=1.8, zorder=3)

# Eixos coordenados (desenhados à mão, estilo livro-texto)
L = {"x": 1.7, "y": 1.8, "z": 2.5}
ax.plot([1, L["x"]], [0, 0], [0, 0], color="dimgray", lw=1)
ax.plot([0, 0], [1, L["y"]], [0, 0], color="dimgray", lw=1)
ax.plot([0, 0], [0, 0], [2, L["z"]], color="dimgray", lw=1)
ax.quiver(L["x"] - 0.01, 0, 0, 0.12, 0, 0, color="dimgray", arrow_length_ratio=1)
ax.quiver(0, L["y"] - 0.01, 0, 0, 0.12, 0, color="dimgray", arrow_length_ratio=1)
ax.quiver(0, 0, L["z"] - 0.01, 0, 0, 0.15, color="dimgray", arrow_length_ratio=1)
ax.text(L["x"] + 0.2, 0, 0, "$x$", fontsize=15)
ax.text(0, L["y"] + 0.2, 0, "$y$", fontsize=15)
ax.text(0, 0, L["z"] + 0.25, "$z$", fontsize=15)

# Rótulos dos vértices
labels = {
    A: ("(0,0,0)", (-0.05, -0.42, -0.2)),
    B: ("(1,0,0)", (0.05, -0.35, -0.12)),
    C: ("(1,1,0)", (0.05, 0.05, -0.2)),
    D: ("(0,1,0)", (0.0, 0.06, -0.14)),
    E: ("(0,0,2)", (-0.05, -0.30, 0.06)),
    F: ("(1,0,2)", (0.05, -0.38, 0.02)),
    G: ("(1,1,1)", (0.05, 0.06, -0.02)),
    H: ("(0,1,1)", (0.0, 0.06, 0.05)),
}
for (x, y, z), (txt, (dx, dy, dz)) in labels.items():
    ax.scatter([x], [y], [z], color="black", s=14, zorder=4)
    ax.text(x + dx, y + dy, z + dz, txt, fontsize=9.5, zorder=5)

# Rótulo do plano inclinado sobre a própria face
ax.text(0.6, 0.8, 1.3, r"$z = 2 - y$", fontsize=12, color="#a63603",
        ha="center", zorder=10)

ax.set_xlim(0, 1.8)
ax.set_ylim(0, 1.8)
ax.set_zlim(0, 2.7)
ax.set_box_aspect((1.8, 1.8, 2.7))
ax.set_axis_off()
ax.set_title(r"Sólido $W$ em $\mathbb{R}^3$", fontsize=14, y=1.1)

ax.legend(
    handles=[Patch(facecolor=c, edgecolor="gray", alpha=0.8, label=lbl)
             for _, c, lbl in faces],
    loc="center left", bbox_to_anchor=(0.88, 0.5), fontsize=10,
    title="Fronteira de $W$", title_fontsize=10.5, frameon=True,
)

# ------------------------------------------- seção transversal (plano yz)
ax2 = fig.add_subplot(1, 2, 2)
trap = [(0, 0), (1, 0), (1, 1), (0, 2)]
ax2.add_patch(Polygon(trap, closed=True, facecolor="#c7e9c0",
                      edgecolor="black", lw=1.8))
ax2.plot([0, 1], [2, 1], color="#e6550d", lw=2.4)
ax2.plot([1, 1.45], [1, 0.55], color="#e6550d", lw=1, ls=":")
ax2.text(0.55, 1.62, r"$z = 2 - y$", color="#a63603", fontsize=12)
ax2.text(0.5, 0.65, "trapézio\n(base do prisma)", ha="center", fontsize=11)

for (y, z), txt, off in [((0, 0), "(0,0)", (-0.2, -0.16)),
                         ((1, 0), "(1,0)", (0.03, -0.16)),
                         ((1, 1), "(1,1)", (0.05, 0.03)),
                         ((0, 2), "(0,2)", (0.05, 0.03))]:
    ax2.plot(y, z, "ko", ms=4)
    ax2.text(y + off[0], z + off[1], txt, fontsize=10)

ax2.annotate("", xy=(1.6, 0), xytext=(-0.1, 0),
             arrowprops=dict(arrowstyle="->", color="dimgray"))
ax2.annotate("", xy=(0, 2.5), xytext=(0, -0.1),
             arrowprops=dict(arrowstyle="->", color="dimgray"))
ax2.text(1.62, -0.05, "$y$", fontsize=14)
ax2.text(-0.06, 2.53, "$z$", fontsize=14)

ax2.set_xlim(-0.3, 1.8)
ax2.set_ylim(-0.3, 2.7)
ax2.set_aspect("equal")
ax2.axis("off")
ax2.set_title("Seção transversal para cada $x \\in [0,1]$\n(vista no plano $yz$)",
              fontsize=13)

fig.suptitle(
    r"$W = \{(x,y,z) \in \mathbb{R}^3 :\ 0 \leq x \leq 1,\ "
    r"0 \leq y \leq 1,\ 0 \leq z \leq 2 - y\}$",
    fontsize=14, y=0.99,
)
fig.tight_layout()
fig.savefig("solido_W.png", dpi=160, bbox_inches="tight")
print("salvo em solido_W.png")
