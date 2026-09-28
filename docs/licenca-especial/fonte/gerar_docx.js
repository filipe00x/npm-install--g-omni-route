const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, PageOrientation,
  LevelFormat, Header, Footer, PageNumber, PageBreak, VerticalAlign, TableLayoutType,
} = require("docx");

const DIR = __dirname;
const OUT = process.argv[2] || path.join(DIR, "Redesenho_Processo_Licenca_Especial.docx");

const NAVY = "1F3864";
const BLUE = "2E75B6";
const LIGHT = "DEEAF6";
const ZEBRA = "F2F6FB";
const GREEN = "548235";
const LGREEN = "E2EFDA";
const RED = "C00000";
const LRED = "FBE4E4";
const GREY = "595959";
const FONT = "Arial";

const PORTRAIT_W = 9638; // A4 - 2 x 2 cm
const LANDSCAPE_W = 14570;

// ------------------------------------------------------------ helpers
function runs(text, base = {}) {
  // **negrito** simples
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  return parts.map((p) =>
    p.startsWith("**") ? new TextRun({ text: p.slice(2, -2), bold: true, ...base }) : new TextRun({ text: p, ...base })
  );
}

const P = (text, opts = {}) =>
  new Paragraph({
    children: runs(text, opts.run || {}),
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 276 },
    keepNext: opts.keepNext,
  });

const H1 = (text, pageBreak = false) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)], pageBreakBefore: pageBreak });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

const bullet = (text, level = 0, keepNext = false) =>
  new Paragraph({ numbering: { reference: "bullets", level }, children: runs(text), spacing: { after: 60, line: 264 }, keepNext });

const numberingConfigs = [
  {
    reference: "bullets",
    levels: [
      { level: 0, format: LevelFormat.BULLET, text: "▪", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } }, run: { color: NAVY } } },
      { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
    ],
  },
];
let numCounter = 0;
function numbered(items) {
  const ref = `num${++numCounter}`;
  numberingConfigs.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 360 } }, run: { bold: true, color: NAVY } } }],
  });
  return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 80, line: 264 } }));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(content, width, opts = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map(
    (t) =>
      new Paragraph({
        children: runs(t, { size: opts.size || 18, bold: opts.bold, color: opts.color }),
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { after: 20, line: 250 },
        keepNext: opts.keepNext,
      })
  );
  return new TableCell({
    children: paras,
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    columnSpan: opts.span,
  });
}

// widths: proporções que somam 1 (ou DXA absolutos)
function table(headers, rows, widths, total = PORTRAIT_W, opts = {}) {
  const sum = widths.reduce((a, b) => a + b, 0);
  let w = widths.map((x) => Math.floor((x / sum) * total));
  w[w.length - 1] += total - w.reduce((a, b) => a + b, 0);
  const trs = [];
  if (headers) {
    trs.push(
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h, i) => cell(h, w[i], { bold: true, color: "FFFFFF", fill: NAVY, size: opts.hsize || 18, align: AlignmentType.CENTER, keepNext: true })),
      })
    );
  }
  const keep = opts.keep !== false && rows.length <= 9;
  rows.forEach((r, ri) => {
    const keepNext = keep && (ri < rows.length - 1 || opts.keepLast);
    trs.push(
      new TableRow({
        cantSplit: true,
        children: r.map((c, i) => {
          let fill = ri % 2 === 1 ? ZEBRA : undefined;
          if (opts.firstColFill && i === 0) fill = LIGHT;
          if (opts.cellFill) fill = opts.cellFill(ri, i, c) || fill;
          return cell(c, w[i], {
            fill,
            bold: opts.firstColBold && i === 0,
            size: opts.size || 18,
            align: opts.center && opts.center.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT,
            keepNext,
          });
        }),
      })
    );
  });
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: w, rows: trs, layout: TableLayoutType.FIXED });
}

let figN = 0;
function figure(file, widthPx, caption) {
  const [pw, ph] = pngSize(path.join(DIR, file));
  const h = Math.round((widthPx * ph) / pw);
  figN++;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      keepNext: true,
      children: [new ImageRun({ type: "png", data: fs.readFileSync(path.join(DIR, file)), transformation: { width: widthPx, height: h },
        altText: { title: caption, description: caption, name: file } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Figura ${figN} – ${caption}`, italics: true, size: 18, color: GREY })],
    }),
  ];
}
function pngSize(f) {
  const b = fs.readFileSync(f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

let tabN = 0;
const tcap = (text) =>
  new Paragraph({
    keepNext: true,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text: `Tabela ${++tabN} – ${text}`, bold: true, size: 18, color: NAVY })],
  });

function callout(title, lines, fill = LIGHT, edge = NAVY, total = PORTRAIT_W) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: fill };
  const left = { style: BorderStyle.SINGLE, size: 36, color: edge };
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: [total],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: total, type: WidthType.DXA },
            borders: { top: b, bottom: b, right: b, left },
            shading: { fill, type: ShadingType.CLEAR, color: "auto" },
            margins: { top: 120, bottom: 120, left: 240, right: 200 },
            children: [
              new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: title, bold: true, color: edge, size: 22 })] }),
              ...lines.map((l) => new Paragraph({ spacing: { after: 60, line: 264 }, children: runs(l, { size: 20 }) })),
            ],
          }),
        ],
      }),
    ],
  });
}

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

function header() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 4 } },
        children: [new TextRun({ text: "Redesenho do Processo de Licença Especial – Corpo de Aspirantes", size: 16, color: GREY })],
      }),
    ],
  });
}
function footer() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
          new TextRun({ text: " de ", size: 16, color: GREY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
        ],
      }),
    ],
  });
}
const margins = { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 567 };
const portrait = (children, extra = {}) => ({
  properties: { page: { size: { width: 11906, height: 16838 }, margin: margins }, ...extra },
  headers: { default: header() },
  footers: { default: footer() },
  children,
});
const landscape = (children) => ({
  properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: margins } },
  headers: { default: header() },
  footers: { default: footer() },
  children,
});

// ------------------------------------------------------------ CAPA
const capa = [
  spacer(1400),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "PROPOSTA DE MELHORIA DE PROCESSO", bold: true, size: 24, color: BLUE, characterSpacing: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 10 } },
    children: [new TextRun({ text: "Redesenho e Reprocessamento do Processo de Licença Especial", bold: true, size: 48, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 600 },
    children: [new TextRun({ text: "Diagnóstico do processo atual, diagrama SIPOC, novo fluxo, regras, ferramentas e plano de implantação", size: 24, color: GREY })] }),
  callout("Proposta em uma frase", [
    "O aspirante faz **um único pedido de cerca de 2 minutos**, sem sair do lugar; a companhia aprova **uma relação por dia, em lote**, dentro do horário da rotina; e às 17h00 a Portaria libera quem está na relação.",
  ]),
  spacer(1600),
  table(null, [
    ["Público-alvo", "Comando do Corpo de Aspirantes, Comandantes de Companhia (Tenentes), ComCia e ComPel (Aspirantes), Encarregados de Papeleta/Licenças, Oficial de Serviço e Portaria"],
    ["Abrangência", "6 companhias × 3 pelotões (18 pelotões)"],
    ["Metodologia", "Mapeamento AS-IS/TO-BE, SIPOC, análise de valor agregado e desperdícios (Lean), RACI, indicadores e ciclo PDCA"],
    ["Data", "Setembro de 2026"],
  ], [1, 3.4], PORTRAIT_W, { firstColFill: true, firstColBold: true }),
];

// ------------------------------------------------------------ 1-3
const parte1 = [
  H1("1. Sumário executivo"),
  P("Hoje, para gozar uma licença especial que **já lhe foi concedida**, o aspirante precisa percorrer uma papeleta física por **quatro assinaturas em série**: Comandante de Pelotão (Asp), Comandante de Companhia (Asp), Encarregado de Papeleta (Asp) e Comandante de Companhia (Tenente). Cada assinatura exige localizar o assinante, esperar e, muitas vezes, voltar em outro horário. Esse esforço sai do recurso mais escasso do aspirante do 1º ano, o seu **tempo livre de aproximadamente 2 horas por dia (entre 1 e 3 horas)**, e gera interrupções repetidas para os oficiais."),
  P("A proposta substitui a papeleta individual por um **pedido eletrônico único** e por uma **Relação Diária de Licença Especial (RDLE)** por companhia, conferida por planilha, com **ciência por exceção** do ComPel, **visto único** do ComCia (Asp) e **aprovação em lote** do ComCia (Tenente). Como a licença só pode ser gozada **a partir das 17h00**, todo o trâmite é feito **durante o horário da rotina, em paralelo**, e fica concluído antes da liberação. A decisão final continua com o oficial, e a cadeia de comando é preservada."),
  tcap("Principais ganhos esperados (cenário ilustrativo de 15 pedidos por companhia por dia)"),
  table(["Indicador", "Processo atual", "Processo proposto", "Variação"], [
    ["Tempo gasto pelo aspirante por pedido", "20 a 60 min (estimado)", "≈ 2 min", "−90% a −97%"],
    ["Parcela do tempo livre diário consumida (base 2 h)", "17% a 50%", "< 2%", "tempo devolvido ao aspirante"],
    ["Deslocamentos do aspirante", "4 ou mais (com retornos)", "Nenhum", "−100%"],
    ["Assinaturas/vistos por dia (6 companhias)", "360 (90 pedidos × 4)", "12 (2 por companhia)", "−97%"],
    ["Interrupções do ComCia (Tenente) por dia", "≈ 15 por companhia", "1 por companhia", "−93%"],
    ["Previsibilidade do resultado", "Depende da disponibilidade de 4 pessoas", "Resposta garantida até 16h30", "tempo de ciclo fixo"],
  ], [3, 2.2, 2.2, 1.8], PORTRAIT_W, { firstColBold: true, center: [1, 2, 3] }),
  P("Os tempos do processo atual são **estimativas** e devem ser confirmados por cronometragem durante o piloto (Seção 14).", { run: { italics: true, size: 18, color: GREY }, before: 80 }),

  H1("2. Contexto e premissas"),
  bullet("A licença especial (LE) é um direito **já concedido** ao aspirante. O processo não decide se ele merece a LE; apenas verifica se **pode gozá-la naquele dia**."),
  bullet("A LE **só pode ser gozada a partir das 17h00**, após o cumprimento da rotina. Portanto, **não há urgência operacional antes das 17h00**, e existe uma janela de várias horas em que o trâmite pode correr sem ninguém se deslocar."),
  bullet("O aspirante do 1º ano dispõe de **cerca de 2 horas livres por dia (entre 1 e 3 horas)**. Todo minuto gasto em burocracia sai desse saldo, que também serve para estudo, descanso e assuntos pessoais."),
  bullet("Trata-se de **organização militar**: a cadeia de comando, a autoridade do oficial e o controle de quem sai e quem fica devem ser preservados ou melhorados."),
  bullet("Estrutura considerada:", 0, true),
  tcap("Estrutura envolvida no processo"),
  table(["Elemento", "Quantidade", "Papel no processo atual"], [
    ["Companhias", "6", "Unidade de controle da licença"],
    ["Pelotões", "18 (3 por companhia)", "Unidade de enquadramento do aspirante"],
    ["Comandantes de Pelotão – ComPel (Asp)", "18", "1ª assinatura"],
    ["Comandantes de Companhia – ComCia (Asp)", "6", "2ª assinatura"],
    ["Encarregados de Papeleta (Asp)", "6 (um por companhia)", "3ª assinatura"],
    ["Comandantes de Companhia – ComCia (Tenente)", "6", "4ª assinatura (autoridade que autoriza)"],
  ], [3.2, 1.6, 3], PORTRAIT_W, { firstColBold: true, center: [1] }),

  H1("3. Processo atual (AS-IS)"),
  P("O processo atual, representado na Figura 1 e no SIPOC da Figura 2, segue as etapas abaixo:"),
  ...numbered([
    "O aspirante que deseja licenciar e possui LE retira uma papeleta física.",
    "Procura o **ComPel (Asp)** para a 1ª assinatura.",
    "Procura o **ComCia (Asp)** para a 2ª assinatura.",
    "Procura o **Encarregado de Papeleta (Asp)** para a 3ª assinatura.",
    "Procura o **ComCia (Tenente)** para a 4ª assinatura.",
    "Entrega ou apresenta a papeleta e, a partir das 17h00, licencia.",
  ]),
  P("Quando qualquer assinante está em aula, em serviço, fora da companhia ou quando a papeleta apresenta erro, o aspirante precisa voltar em outro momento. O custo de coordenar quatro agendas fica inteiramente com o solicitante.", { before: 80 }),
];

// ------------------------------------------------------------ landscape AS-IS
const figsAsIs = [
  ...figure("fluxo_atual.png", 930, "Fluxograma do processo atual: quatro assinaturas sequenciais e laço de retrabalho"),
  callout("Leitura do fluxograma", [
    "Todas as etapas são **sequenciais** (a 2ª assinatura só começa depois da 1ª), **individuais** (uma papeleta por aspirante) e **presenciais** (quem se desloca é o aspirante).",
    "O tempo total do ciclo não depende do trabalho de cada assinante, que é de segundos, mas da **espera** para encontrá-lo.",
  ], LRED, RED, LANDSCAPE_W),
  new Paragraph({ children: [new PageBreak()] }),
  ...figure("sipoc_atual.png", 900, "Diagrama SIPOC do processo atual"),
];

// ------------------------------------------------------------ 4-6
const parte2 = [
  H1("4. Diagnóstico"),
  H2("4.1 Análise de valor agregado por etapa"),
  P("Uma etapa agrega valor quando responde a uma pergunta necessária para liberar o aspirante com segurança: **ele tem saldo? está impedido? a autoridade competente autorizou? a Portaria sabe quem pode sair?** O resto é custo de coordenação."),
  tcap("Análise de valor das etapas atuais"),
  table(["Etapa atual", "Agrega valor?", "O que realmente importa nela", "Decisão no redesenho"], [
    ["Retirar a papeleta", "Não", "Registrar a intenção de licenciar", "**Substituir** por pedido eletrônico ou Livro de Pedidos"],
    ["Assinatura do ComPel (Asp)", "Parcial", "Saber se há impedimento no pelotão", "**Transformar** em ciência com veto por exceção"],
    ["Assinatura do ComCia (Asp)", "Parcial", "Visão consolidada da companhia", "**Manter** como visto único na relação (lote)"],
    ["Assinatura do Encarregado de Papeleta", "Não, como assinatura", "Controle de saldo e registro", "**Eliminar** a assinatura; a função vira controlador da RDLE"],
    ["Assinatura do ComCia (Tenente)", "Sim", "Autorização da autoridade competente", "**Manter**, mas uma vez por dia, em lote"],
    ["Entrega/registro da papeleta", "Parcial", "Portaria saber quem pode sair", "**Automatizar**: RDLE enviada à Portaria"],
  ], [2.4, 1.2, 2.5, 3], PORTRAIT_W, {
    firstColBold: true, center: [1],
    cellFill: (r, c, v) => (c === 1 ? (v.startsWith("Sim") ? LGREEN : v.startsWith("Não") ? LRED : "FFF2CC") : undefined),
  }),
  H2("4.2 Desperdícios identificados (os 8 desperdícios do Lean)"),
  tcap("Desperdícios no processo atual"),
  table(["Desperdício", "Como aparece no processo", "Consequência"], [
    ["Espera", "Aspirante aguardando assinante disponível; papeleta parada entre assinaturas", "Tempo livre consumido; ciclo imprevisível"],
    ["Movimentação", "Idas e vindas até quatro pessoas em locais diferentes, às vezes mais de uma vez", "Cansaço e perda do tempo livre"],
    ["Superprocessamento", "Quatro pessoas verificam, sem critério escrito, praticamente a mesma coisa", "Redundância sem ganho de controle"],
    ["Defeitos e retrabalho", "Papeleta rasurada, perdida, com dado errado ou assinada fora de ordem", "Recomeçar o circuito"],
    ["Estoque", "Papeletas acumuladas aguardando o próximo assinante", "Assinante sobrecarregado em picos"],
    ["Transporte", "Documento físico circulando de mão em mão", "Risco de extravio; sem rastreabilidade"],
    ["Talento não utilizado", "Oficiais e aspirantes-líderes usados como carimbadores", "Menos tempo para comando, instrução e estudo"],
    ["Superprodução", "Papeleta preenchida e impressa por pedido", "Papel e arquivo sem uso gerencial"],
  ], [2, 3.4, 2.6], PORTRAIT_W, { firstColBold: true, firstColFill: true }),
  H2("4.3 Causas-raiz"),
  ...numbered([
    "**Controle baseado em documento individual e físico**: cada pedido gera um papel que precisa circular.",
    "**Aprovação sequencial** em vez de consolidada (lote) ou paralela.",
    "**Verificação redundante e sem critério objetivo**: não há uma lista escrita do que impede a licença, então todos checam tudo.",
    "**Ônus da coordenação no solicitante**: quem tem menos tempo (o aspirante) é quem corre atrás das assinaturas.",
    "**Ausência de horários-padrão**: sem prazo fixo, cada pedido é tratado quando e se o assinante for encontrado.",
  ]),

  H1("5. Princípios do redesenho"),
  ...numbered([
    "**O aspirante pede uma vez e não se desloca.** Quem circula é a informação, não o aspirante.",
    "**Aprovar em lote, não por unidade.** Uma relação por companhia por dia substitui dezenas de papeletas.",
    "**Gestão por exceção.** Só se manifesta quem tem objeção; o silêncio no prazo equivale a concordância.",
    "**Critérios objetivos e escritos.** Saldo e impedimentos são conferidos por planilha, não pela memória de quatro pessoas.",
    "**Horários-padrão aproveitando a janela da rotina.** Como a LE só começa às 17h00, o trâmite corre de manhã e à tarde, com resposta garantida às 16h30.",
    "**Preservar a cadeia de comando.** A decisão final permanece com o ComCia (Tenente); ComPel e ComCia (Asp) continuam informados e com poder de veto.",
    "**Plano B físico sempre disponível**, para falta de sinal, de equipamento ou do sistema.",
  ]),

  H1("6. Processo proposto (TO-BE)"),
  H2("6.1 Visão geral"),
  P("O novo processo gira em torno de um único documento: a **Relação Diária de Licença Especial (RDLE)**, gerada uma vez por dia por companhia. O aspirante registra o pedido até **12h30**. O **Encarregado de Licenças** (nova designação do Encarregado de Papeleta) fecha a lista, confere saldo e impedimentos automaticamente e distribui a relação. O **ComPel (Asp)** tem até **14h00** para vetar, com motivo, algum nome do seu pelotão. O **ComCia (Asp)** dá o visto até **15h00**, e o **ComCia (Tenente)** aprova a relação inteira até **16h00**. Às **16h30** a RDLE é publicada e enviada ao Oficial de Serviço e à Portaria. A partir das **17h00**, o aspirante apenas apresenta a identidade e licencia."),
  callout("O que muda na prática", [
    "**Eliminado:** papeleta individual; deslocamentos do aspirante; assinatura do Encarregado; assinatura individual do ComPel.",
    "**Transformado:** ComPel passa a dar ciência com veto por exceção; o Encarregado vira controlador de saldo e dono da RDLE; o ComCia (Asp) e o Tenente assinam **uma relação por dia**, não uma papeleta por aspirante.",
    "**Criado:** prazo de corte (12h30), horário fixo de resposta (16h30), controle na Portaria pela RDLE, baixa automática de saldo e indicadores.",
  ], LGREEN, GREEN),
  spacer(80),
  P("O fluxo detalhado por responsável e horário está na Figura 3; a linha do tempo do dia, na Figura 4; e o passo a passo, na Tabela 5."),
];

// ------------------------------------------------------------ landscape TO-BE
const LW = LANDSCAPE_W;
const figsToBe = [
  ...figure("fluxo_proposto.png", 900, "Fluxograma em raias (swimlane) do processo proposto"),
  new Paragraph({ children: [new PageBreak()] }),
  H2("6.2 Linha do tempo e passo a passo"),
  ...figure("linha_tempo.png", 900, "Linha do tempo do dia D"),
  tcap("Passo a passo do processo proposto"),
  table(["#", "Etapa", "Responsável", "Prazo", "O que é feito", "Tempo estimado"], [
    ["1", "Registrar o pedido", "Aspirante", "Até 12h30 do dia D (pode ser feito com até 7 dias de antecedência)", "Preenche o formulário eletrônico ou, no Plano B, escreve uma linha no Livro de Pedidos da companhia. Pode agendar vários dias de uma vez.", "≈ 2 min"],
    ["2", "Consolidar e conferir", "Encarregado de Licenças (Asp)", "12h30 – 13h30", "Encerra os pedidos do dia. A planilha cruza cada nome com o saldo de LE, a escala de serviço e a relação de impedidos, marca APTO ou NEGADO (com motivo) e gera a RDLE por pelotão e companhia. Envia a parte de cada pelotão ao respectivo ComPel.", "15 – 20 min por dia"],
    ["3", "Ciência do pelotão", "ComPel (Asp)", "Até 14h00", "Confere os nomes do seu pelotão. Só se manifesta se houver impedimento não registrado, sempre com motivo. O silêncio no prazo equivale a de acordo.", "≈ 2 min por dia"],
    ["4", "Validar a RDLE", "ComCia (Asp)", "Até 15h00", "Revisa a relação consolidada, resolve pendências e vetos e dá o visto único da companhia.", "≈ 5 min por dia"],
    ["5", "Aprovar a RDLE", "ComCia (Tenente)", "Até 16h00", "Aprova a relação inteira com assinatura única ou \"de acordo\" eletrônico. Pode excluir nomes, com motivo.", "≈ 5 min por dia"],
    ["6", "Publicar", "Encarregado de Licenças (Asp)", "16h30", "Publica a RDLE no canal oficial ou no quadro da companhia, envia ao Oficial de Serviço e à Portaria, e cada aspirante vê APTO ou NEGADO.", "≈ 5 min"],
    ["7", "Licenciar", "Aspirante e Portaria", "A partir das 17h00", "O aspirante apresenta a identidade. A Portaria confere o nome na RDLE e registra saída e, depois, regresso.", "< 1 min"],
    ["8", "Baixar saldo e atualizar indicadores", "Encarregado de Licenças (Asp)", "D+1, até 08h00", "Debita o saldo apenas de quem efetivamente saiu, conforme o registro da Portaria, e atualiza os indicadores.", "≈ 5 min"],
  ], [0.35, 1.5, 1.6, 1.9, 5.2, 1.2], LW, { center: [0, 5], size: 17, keep: false }),

  H1("7. Diagrama SIPOC do processo proposto", true),
  ...figure("sipoc_proposto.png", 880, "Diagrama SIPOC do processo proposto"),
  tcap("SIPOC detalhado do processo proposto"),
  table(["S – Fornecedores", "I – Entradas", "P – Processo", "O – Saídas", "C – Clientes"], [
    [
      ["Aspirante solicitante", "Setor que concede a LE", "Escalante de serviço", "Setor disciplinar", "ComPel (Asp)", "Responsável pelo formulário e pela planilha"],
      ["Pedido eletrônico ou linha no Livro de Pedidos", "Saldo de LE por aspirante", "Escala de serviço do dia", "Relação de impedidos", "Vetos por exceção do ComPel, com motivo", "Norma interna do processo (Anexo A)"],
      ["1. Registrar o pedido (até 12h30)", "2. Consolidar e conferir saldo e impedimentos (12h30–13h30)", "3. Ciência do ComPel com veto por exceção (até 14h)", "4. Validar (ComCia Asp, até 15h) e aprovar em lote (Ten, até 16h)", "5. Publicar a RDLE (16h30)", "6. Licenciar a partir das 17h e baixar o saldo (D+1)"],
      ["RDLE aprovada, uma por companhia", "Confirmação ao aspirante: APTO ou NEGADO com motivo", "Lista de controle da Portaria e do Oficial de Serviço", "Registro de saída e regresso", "Saldo de LE atualizado", "Indicadores do processo"],
      ["Aspirante (licença gozada sem perda de tempo livre)", "ComCia (Tenente) e ComCia (Asp): controle com menos interrupções", "Oficial de Serviço e Portaria: lista única e confiável", "Comando do Corpo de Aspirantes: rastreabilidade", "Setor que controla a LE: saldo correto"],
    ],
  ], [1, 1, 1.15, 1, 1.1], LW, { size: 17 }),
];

// ------------------------------------------------------------ 8-17
const parte3 = [
  H1("8. Papéis e responsabilidades (matriz RACI)"),
  P("**R** = executa · **A** = responde pelo resultado (um por atividade) · **C** = consultado · **I** = informado."),
  tcap("Matriz RACI do processo proposto"),
  table(["Atividade", "Aspirante", "Enc. Licenças (Asp)", "ComPel (Asp)", "ComCia (Asp)", "ComCia (Ten)", "Of. Serviço / Portaria"], [
    ["Registrar o pedido", "R/A", "I", "", "", "", ""],
    ["Manter o saldo de LE atualizado", "I", "R", "", "A", "", ""],
    ["Consolidar e conferir (gerar a RDLE)", "", "R", "I", "A", "", ""],
    ["Ciência e veto por exceção", "", "I", "R", "A", "", ""],
    ["Validar a RDLE", "", "C", "C", "R", "A", ""],
    ["Aprovar a RDLE", "", "I", "", "C", "R/A", ""],
    ["Publicar e distribuir a RDLE", "I", "R", "I", "A", "I", "I"],
    ["Controlar saída e regresso", "R", "I", "", "", "", "A"],
    ["Baixar saldo e atualizar indicadores", "", "R", "", "A", "I", ""],
    ["Tratar exceções", "C", "C", "C", "R", "A", "C"],
  ], [2.5, 1.15, 1.2, 1, 1, 1, 1.2], PORTRAIT_W, { firstColBold: true, center: [1, 2, 3, 4, 5, 6], size: 17, hsize: 16 }),
  P("A função de **Encarregado de Papeleta** passa a se chamar **Encarregado de Licenças da Companhia** (um por companhia, com um auxiliar designado). Ela deixa de ser uma assinatura e passa a ser a de **controlador do processo**: dono da planilha, da RDLE e dos indicadores.", { before: 120 }),

  H1("9. Regras do processo"),
  ...numbered([
    "A LE só pode ser gozada **a partir das 17h00**, após o término da rotina. Nenhuma etapa do processo exige deslocamento do aspirante.",
    "O pedido é **único, por aspirante**, feito até **12h30 do dia D**. Pode ser registrado com até **7 dias de antecedência** e para vários dias de uma vez.",
    "A autorização é dada por **relação (lote) por companhia**, nunca por papeleta individual.",
    "O ComPel (Asp) dá **ciência com veto por exceção até 14h00**. A ausência de manifestação no prazo equivale a de acordo. Todo veto deve ter motivo registrado.",
    "Os **únicos motivos de negação** são: (a) falta de saldo; (b) escala de serviço no período; (c) impedimento disciplinar; (d) outra pendência formalmente determinada pelo comando; (e) decisão fundamentada do ComCia (Tenente).",
    "O aspirante pode **cancelar o pedido até 16h00** sem ônus. Após esse horário, comunica ao Encarregado ou ao Oficial de Serviço.",
    "**Só licencia quem consta na RDLE aprovada.** A Portaria confere o nome e a identidade.",
    "O saldo é debitado **somente com a saída efetivamente registrada** na Portaria.",
    "Na ausência do ComCia (Tenente), aprova o **substituto designado**. Na ausência do Encarregado, assume o **auxiliar designado**.",
    "Os registros (pedidos, RDLE e controle da Portaria) são arquivados pelo prazo definido pelo comando, para fins de auditoria.",
    "Horário de regresso, uniforme e demais condições da licença permanecem **conforme as normas vigentes**. Esta proposta muda como se pede e se autoriza, não o direito à licença.",
  ]),

  H1("10. Tratamento de exceções"),
  tcap("Exceções e como tratá-las"),
  table(["Situação", "Tratamento", "Quem decide"], [
    ["Pedido após 12h30, com motivo justificado", "O Encarregado inclui o pedido em uma RDLE complementar. Após 16h00, o caso vai ao Oficial de Serviço. Uso restrito a casos excepcionais, acompanhado pelo indicador de pedidos fora do prazo.", "ComCia (Ten) ou Oficial de Serviço"],
    ["Impedimento surgido após a aprovação (punição, escala, falta à rotina)", "ComPel ou ComCia (Asp) comunica ao Encarregado e à Portaria; o nome é retirado da RDLE e o aspirante é avisado. Vale sempre a última versão publicada.", "ComCia (Asp)"],
    ["Aspirante desiste", "Cancela no formulário até 16h00 ou avisa o Encarregado. O saldo não é debitado.", "Aspirante"],
    ["Atividade de rotina estendida após as 17h00", "A saída ocorre após o término da atividade; a RDLE continua válida.", "Oficial de Serviço"],
    ["ComCia (Tenente) ausente", "Aprova o substituto designado previamente, por exemplo o ComCia de outra companhia ou um oficial indicado.", "Comando do Corpo de Aspirantes"],
    ["Encarregado de Licenças ausente", "Assume o auxiliar designado.", "ComCia (Asp)"],
    ["Sistema ou internet indisponível", "Plano B: Livro de Pedidos e RDLE manuscrita, com os mesmos horários.", "Encarregado de Licenças"],
    ["Divergência de saldo", "Vale o registro da planilha; o aspirante pode contestar ao ComCia (Asp) até D+2.", "ComCia (Asp)"],
    ["Veto do ComPel contestado", "Decide o ComCia (Asp); persistindo a divergência, decide o ComCia (Tenente).", "ComCia (Asp) / (Ten)"],
  ], [2.4, 4.4, 1.6], PORTRAIT_W, { firstColBold: true }),

  H1("11. Ferramentas e modelos"),
  P("A solução usa ferramentas simples e gratuitas (por exemplo, Google Forms e Planilhas ou Microsoft Forms e Excel) ou o sistema institucional, se houver. O importante é o **método**, não a ferramenta."),
  H2("11.1 Formulário de pedido (preenchimento de cerca de 2 minutos)"),
  tcap("Campos do formulário de pedido"),
  table(["Campo", "Tipo", "Observação"], [
    ["Data e hora do pedido", "Automático", "Registrado pelo sistema"],
    ["Número e nome de guerra", "Lista ou texto", "Preferencialmente lista suspensa, para evitar erro de digitação"],
    ["Companhia / Pelotão", "Lista", "Usado para montar a RDLE e distribuir aos ComPel"],
    ["Data(s) pretendida(s)", "Data (múltipla)", "Permite agendar até 7 dias à frente"],
    ["Telefone de contato durante a licença", "Texto", "Segurança e contato em caso de necessidade"],
    ["Cancelar pedido?", "Sim / Não", "Usado para cancelamento até 16h00"],
    ["Declaração de ciência das normas", "Caixa de seleção", "\"Declaro conhecer as normas de licença\""],
  ], [2.4, 1.6, 4.4], PORTRAIT_W, { firstColBold: true }),
  H2("11.2 Planilha de controle (uma por companhia)"),
  tcap("Abas da planilha de controle"),
  table(["Aba", "Conteúdo", "Quem alimenta"], [
    ["Pedidos", "Respostas do formulário (automático)", "Formulário"],
    ["Saldo", "Nº, nome, pelotão, LE concedidas, LE gozadas, saldo", "Encarregado (a partir das publicações de concessão)"],
    ["Impedimentos", "Nº, data, motivo, fonte (escala, disciplinar, comando)", "Encarregado, com dados do escalante e do setor disciplinar"],
    ["RDLE", "Relação do dia, filtrada por data e pelotão, com status", "Automático (fórmulas)"],
    ["Portaria", "Nº, hora de saída, hora de regresso", "Portaria (ou transcrição da RDLE impressa)"],
    ["Indicadores", "Painel com os indicadores da Seção 13", "Automático (fórmulas)"],
  ], [1.5, 4.2, 2.7], PORTRAIT_W, { firstColBold: true }),
  P("Exemplos de fórmulas (padrão em português do Excel ou do Google Planilhas):", { before: 120 }),
  bullet("Saldo: **=E2-F2** (LE concedidas menos LE gozadas)."),
  bullet("Status do pedido na RDLE, onde B2 é o número do aspirante e $H$1 é a data D:"),
  new Paragraph({
    spacing: { after: 120 }, indent: { left: 540 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" },
    children: [new TextRun({ text: "=SE(CONT.SES(Impedimentos!A:A;B2;Impedimentos!B:B;$H$1)>0;\"NEGADO – impedimento\";SE(PROCV(B2;Saldo!A:G;7;FALSO)<=0;\"NEGADO – sem saldo\";\"APTO\"))", font: "Courier New", size: 17 })],
  }),
  H2("11.3 Modelo da Relação Diária de Licença Especial (RDLE)"),
  tcap("Modelo de RDLE (preenchido com dados fictícios)"),
  table(null, [["RELAÇÃO DIÁRIA DE LICENÇA ESPECIAL – ___ª COMPANHIA – DATA: ___/___/______"]], [1], PORTRAIT_W, { cellFill: () => LIGHT, firstColBold: true, keepLast: true }),
  table(["Ord", "Nº / Nome de guerra", "Pel", "Saldo", "Situação", "Motivo (se negado)", "Saída", "Regresso"], [
    ["1", "0000 – ASP. EXEMPLO A", "1º", "2", "APTO", "", "17h05", "____"],
    ["2", "0000 – ASP. EXEMPLO B", "1º", "0", "NEGADO", "Sem saldo", "–", "–"],
    ["3", "0000 – ASP. EXEMPLO C", "2º", "1", "NEGADO", "Escalado de serviço", "–", "–"],
    ["4", "0000 – ASP. EXEMPLO D", "3º", "3", "APTO", "", "____", "____"],
  ], [0.5, 2.3, 0.6, 0.7, 1.1, 1.8, 0.85, 1.1], PORTRAIT_W, {
    center: [0, 2, 3, 4, 6, 7], size: 17, keepLast: true,
    cellFill: (r, c, v) => (c === 4 ? (v === "APTO" ? LGREEN : LRED) : undefined),
  }),
  table(null, [[
    "Consolidada por: Enc. Licenças ____________   Ciência dos ComPel: até 14h00   Visto: ComCia (Asp) ____________   Aprovo: ComCia (Ten) ____________   Publicada às ___h___",
  ]], [1], PORTRAIT_W, { size: 16 }),
  H2("11.4 Plano B (sem sistema ou sem acesso a celular)"),
  bullet("**Livro de Pedidos** na sala da companhia (ou caixa de pedidos): o aspirante escreve uma linha (nº, nome, data) até 12h30. Leva menos de 1 minuto e não exige encontrar ninguém."),
  bullet("O Encarregado transcreve o livro para a planilha ou monta a RDLE à mão. **Os horários e responsáveis continuam os mesmos.**"),
  bullet("Para aspirantes sem acesso ao celular durante o dia, recomenda-se **fazer o pedido na véspera**, à noite, ou agendar a semana."),

  H1("12. Comparativo: antes × depois"),
  tcap("Comparativo entre o processo atual e o proposto"),
  table(["Aspecto", "Processo atual", "Processo proposto"], [
    ["Documento", "Papeleta física individual", "Pedido eletrônico único e RDLE por companhia"],
    ["Assinaturas por pedido", "4, em série", "Nenhuma individual; 2 vistos por companhia por dia, em lote"],
    ["Deslocamentos do aspirante", "Até 4, mais retornos", "Nenhum"],
    ["Tempo do aspirante por pedido", "20 a 60 min (estimado)", "≈ 2 min"],
    ["Uso do tempo livre diário (≈ 2 h)", "17% a 50% (até 100% em dias de 1 h livre)", "Menos de 2%"],
    ["Interrupções do ComCia (Tenente)", "1 por pedido", "1 por dia"],
    ["Papel do ComPel (Asp)", "Assinar cada papeleta", "Ciência do pelotão com veto por exceção"],
    ["Papel do Encarregado", "Mais uma assinatura", "Controlador de saldo, dono da RDLE e dos indicadores"],
    ["Quando o aspirante sabe o resultado", "Só ao obter a última assinatura", "Sempre até 16h30"],
    ["Controle de saldo", "Manual, sujeito a erro", "Por planilha, debitado após a saída efetiva"],
    ["Controle na Portaria", "Papeleta apresentada individualmente", "RDLE oficial e identidade"],
    ["Rastreabilidade e indicadores", "Inexistentes", "Registro completo e painel de indicadores"],
    ["Cadeia de comando", "Preservada", "Preservada: a decisão final continua com o Tenente"],
  ], [2.4, 3, 3.2], PORTRAIT_W, { firstColBold: true, firstColFill: true }),
  H2("12.1 Estimativa de ganhos (cenário ilustrativo)"),
  P("Premissa: **15 pedidos por companhia por dia**, ou seja, **90 pedidos por dia** nas 6 companhias. Os valores devem ser recalculados com os dados reais levantados no piloto."),
  tcap("Estimativa de ganhos diários"),
  table(["Métrica diária (6 companhias)", "Atual", "Proposto", "Redução"], [
    ["Assinaturas ou vistos", "90 × 4 = 360", "6 × 2 = 12", "−97%"],
    ["Horas-aspirante gastas no processo", "90 × 20–60 min = 30 a 90 h", "90 × 2 min = 3 h", "−90% a −97%"],
    ["Horas dos Encarregados", "Assinatura avulsa, dispersa", "6 × 20 min = 2 h (concentradas e programadas)", "trabalho previsível"],
    ["Interrupções dos Tenentes", "≈ 90", "6", "−93%"],
  ], [3, 2.3, 2.6, 1.3], PORTRAIT_W, { firstColBold: true, center: [3] }),

  H1("13. Indicadores de desempenho"),
  tcap("Indicadores de desempenho e metas"),
  table(["Indicador", "Como medir", "Meta", "Frequência", "Responsável"], [
    ["Tempo do aspirante por pedido", "Cronometragem por amostra", "≤ 3 min", "Mensal", "ComCia (Asp)"],
    ["Pontualidade da RDLE", "Dias com RDLE publicada até 16h30 ÷ dias do período", "≥ 98%", "Semanal", "Enc. Licenças"],
    ["Pedidos fora do prazo", "Pedidos após 12h30 ÷ total de pedidos", "≤ 5%", "Semanal", "Enc. Licenças"],
    ["Taxa de negação e motivos", "Pedidos negados ÷ pedidos, por motivo", "Acompanhar", "Semanal", "Enc. Licenças"],
    ["Saídas irregulares", "Saídas sem nome na RDLE aprovada", "Zero", "Diária", "Oficial de Serviço"],
    ["Erros de saldo", "Divergências de saldo apontadas", "Zero", "Mensal", "ComCia (Asp)"],
    ["Vistos por dia", "Contagem de vistos e aprovações", "≤ 12 no total", "Mensal", "Enc. Licenças"],
    ["Satisfação", "Pesquisa de 1 a 5 com aspirantes e oficiais", "≥ 4,0", "Fim do piloto e trimestral", "ComCia (Asp)"],
  ], [2.1, 2.9, 1.3, 1.3, 1.4], PORTRAIT_W, { firstColBold: true, center: [2, 3] }),

  H1("14. Plano de implantação (PDCA)"),
  tcap("Cronograma de implantação"),
  table(["Fase", "Período", "Ações", "Entregável"], [
    ["0. Aprovação", "Semana 1", "Apresentar a proposta ao Comando do Corpo de Aspirantes; ajustar e publicar a norma interna (Anexo A).", "Norma aprovada"],
    ["1. Preparação (Plan)", "Semana 2", "Criar o formulário e a planilha; designar os 6 Encarregados de Licenças e seus auxiliares; lançar os saldos; treinar Encarregados, ComPel, ComCia, Oficiais de Serviço e Portaria (≈ 30 min); divulgar aos aspirantes; medir o tempo atual (linha de base).", "Ferramentas prontas, equipe treinada, linha de base medida"],
    ["2. Piloto (Do)", "Semanas 3 e 4", "Aplicar o processo em 1 companhia (de preferência voluntária); as demais mantêm o processo atual. Coletar os indicadores diariamente.", "Dados do piloto"],
    ["3. Avaliação (Check)", "Semana 5", "Comparar com a linha de base, ouvir aspirantes e oficiais, levantar falhas.", "Relatório ao Comando"],
    ["4. Ajuste e expansão (Act)", "Semanas 6 e 7", "Corrigir o que for necessário e estender às outras 5 companhias.", "Processo em todas as companhias"],
    ["5. Consolidação", "A partir do 3º mês", "Revisão trimestral dos indicadores; avaliar a evolução da Seção 16.", "Melhoria contínua"],
  ], [1.7, 1.2, 4.3, 2], PORTRAIT_W, { firstColBold: true, firstColFill: true }),

  H1("15. Riscos e mitigação"),
  tcap("Riscos e ações de mitigação"),
  table(["Risco", "Mitigação"], [
    ["Aspirante sem acesso a celular ou internet no horário do pedido", "Livro de Pedidos na companhia; pedido na véspera; agendamento para a semana."],
    ["Falha do sistema ou da planilha", "Plano B físico com os mesmos horários; RDLE impressa; cópia de segurança diária."],
    ["Inclusão indevida de nome (fraude ou erro)", "Edição da planilha restrita ao Encarregado e ao ComCia (Asp); histórico de versões; conferência da identidade na Portaria; auditoria semanal por amostragem."],
    ["Impedimento que surge depois da aprovação", "Canal direto ComPel/ComCia → Encarregado → Portaria; vale sempre a última versão da RDLE."],
    ["Sensação de perda de controle pelos oficiais", "A decisão final continua com o Tenente; o ComPel mantém o poder de veto; implantação por piloto com indicadores."],
    ["Ausência do Tenente ou do Encarregado", "Substitutos designados previamente e publicados."],
    ["Sobrecarga do Encarregado", "Planilha automatizada (≈ 20 min por dia) e auxiliar designado."],
    ["Exposição de dados pessoais", "Acesso restrito, coleta apenas do necessário e prazo de guarda definido."],
  ], [3, 5.4], PORTRAIT_W, { firstColBold: true }),

  H1("16. Evolução futura (fase 2)"),
  P("Depois de 3 meses com os indicadores dentro da meta, podem ser adotados avanços graduais:"),
  bullet("**Aprovação tácita pelo Tenente:** a RDLE é publicada automaticamente às 16h00 se não houver veto. O oficial passa a atuar apenas por exceção, e o processo fica com zero vistos obrigatórios."),
  bullet("**Consulta de saldo pelo próprio aspirante**, em modo somente leitura, eliminando dúvidas."),
  bullet("**Controle na Portaria por QR Code** ou por lista em tablet, com registro automático de saída e regresso."),
  bullet("**Integração ao sistema institucional**, se houver, com fim da planilha paralela."),
  bullet("**Aplicação do mesmo método** a outros trâmites semelhantes (dispensas, pernoites, licenças regulares)."),

  H1("17. Conclusão e recomendação"),
  P("O processo atual usa quatro assinaturas presenciais e sequenciais para responder a perguntas que uma planilha e uma única autoridade respondem com mais segurança. O custo recai sobre o tempo livre do aspirante e sobre a atenção dos oficiais. Como a licença só pode ser gozada a partir das 17h00, há tempo de sobra para decidir **em lote, durante a rotina**, sem que ninguém precise se deslocar."),
  callout("Recomendação", [
    "1. Aprovar a adoção da **RDLE** com os horários 12h30 / 14h00 / 15h00 / 16h00 / 16h30 / 17h00.",
    "2. Redesignar o Encarregado de Papeleta como **Encarregado de Licenças**, controlador do processo.",
    "3. Executar **piloto de 2 semanas em 1 companhia**, medir os indicadores e expandir às 6 companhias.",
  ], LGREEN, GREEN),
];

// ------------------------------------------------------------ Anexo A
const anexo = [
  H1("Anexo A – Minuta de norma interna", true),
  P("Minuta para ajuste e aprovação pela autoridade competente.", { run: { italics: true, color: GREY } }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 200 },
    children: [new TextRun({ text: "NORMA INTERNA Nº ____ – PROCEDIMENTO PARA GOZO DE LICENÇA ESPECIAL", bold: true, size: 22, color: NAVY })] }),
  ...[
    "**Art. 1º** Esta norma regula o procedimento para o gozo da Licença Especial (LE) pelos aspirantes do Corpo de Aspirantes.",
    "**Art. 2º** A LE somente poderá ser gozada a partir das 17h00, após o término da rotina diária.",
    "**Art. 3º** O pedido de gozo de LE será feito pelo próprio aspirante, uma única vez, no formulário eletrônico ou, na impossibilidade, no Livro de Pedidos da companhia, até as 12h30 do dia pretendido, podendo ser feito com até 7 (sete) dias de antecedência.",
    "**Art. 4º** Fica instituída a Relação Diária de Licença Especial (RDLE), documento único por companhia que substitui a papeleta individual.",
    "**Art. 5º** Compete ao Encarregado de Licenças da companhia: I – manter atualizado o saldo de LE; II – consolidar os pedidos e gerar a RDLE entre 12h30 e 13h30; III – publicar a RDLE aprovada às 16h30 e encaminhá-la ao Oficial de Serviço e à Portaria; IV – debitar os saldos até as 08h00 do dia seguinte; V – manter os indicadores do processo.",
    "**Art. 6º** Compete ao Comandante de Pelotão (Asp) tomar ciência da RDLE referente ao seu pelotão até as 14h00, manifestando-se apenas em caso de impedimento, sempre com motivo. A ausência de manifestação no prazo implica concordância.",
    "**Art. 7º** Compete ao Comandante de Companhia (Asp) validar a RDLE até as 15h00 e ao Comandante de Companhia (Oficial) aprová-la até as 16h00, podendo excluir nomes mediante motivo.",
    "**Art. 8º** São motivos de negação: I – ausência de saldo; II – escala de serviço; III – impedimento disciplinar; IV – pendência determinada pelo comando; V – decisão fundamentada do Comandante de Companhia (Oficial).",
    "**Art. 9º** Somente poderá licenciar o aspirante que constar da RDLE aprovada, mediante apresentação de identidade na Portaria, onde serão registrados os horários de saída e regresso.",
    "**Art. 10.** O aspirante poderá cancelar o pedido até as 16h00, sem débito de saldo. O saldo será debitado apenas mediante saída efetivamente registrada.",
    "**Art. 11.** Pedidos após o prazo, impedimentos supervenientes e ausências de responsáveis serão tratados conforme o quadro de exceções anexo a esta norma, cabendo a decisão final ao Comandante de Companhia (Oficial) ou, após as 16h00, ao Oficial de Serviço.",
    "**Art. 12.** Permanecem inalteradas as demais condições da LE previstas nas normas vigentes, inclusive quanto ao horário de regresso.",
    "**Art. 13.** Esta norma entra em vigor na data de sua publicação, revogando-se o procedimento de papeleta com quatro assinaturas.",
  ].map((t) => P(t, { after: 140 })),
];

// ------------------------------------------------------------ documento
const doc = new Document({
  creator: "Proposta de melhoria de processo",
  title: "Redesenho do Processo de Licença Especial",
  description: "Diagnóstico, SIPOC e novo processo para gozo de licença especial",
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: NAVY, font: FONT },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0, keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: BLUE, font: FONT },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: { config: numberingConfigs },
  sections: [
    portrait(capa),
    portrait(parte1),
    landscape(figsAsIs),
    portrait(parte2),
    landscape(figsToBe),
    portrait([...parte3, ...anexo]),
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("gerado:", OUT);
});
