// Gera o trabalho acadêmico (ABNT) em .docx. Uso: node trabalho.js <saida.docx> [paginas.json]
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, BorderStyle, LevelFormat, Header, PageNumber, TabStopType, VerticalAlign,
  TableLayoutType, ShadingType,
} = require("../node_modules/docx");

const DIR = __dirname;
const OUT = process.argv[2] || path.join(DIR, "trabalho.docx");
const PAGES = process.argv[3] && fs.existsSync(process.argv[3]) ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : {};

const FONT = "Times New Roman";
const TEXT_W = 9071; // 16 cm
const INDENT = 709; // 1,25 cm
const ANO = "2026";

// ---------------------------------------------------------------- helpers de texto
function runs(text, base = {}) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
    .filter((p) => p !== "")
    .map((p) => {
      if (p.startsWith("**")) return new TextRun({ text: p.slice(2, -2), bold: true, ...base });
      if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return new TextRun({ text: p.slice(1, -1), italics: true, ...base });
      return new TextRun({ text: p, ...base });
    });
}

// parágrafo de texto: justificado, 1,5, recuo de 1,25 cm
const P = (text, o = {}) =>
  new Paragraph({
    children: runs(text, o.run || {}),
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    indent: o.noIndent ? undefined : { firstLine: INDENT },
    spacing: { line: 360, before: 0, after: o.after ?? 0 },
    keepNext: o.keepNext,
  });

const blank = (line = 360) => new Paragraph({ spacing: { line, before: 0, after: 0 }, children: [] });

// títulos
const headings = [];
function H1(num, title, newPage = true) {
  const text = num ? `${num} ${title.toUpperCase()}` : title.toUpperCase();
  headings.push({ level: 1, num, title: title.toUpperCase(), text });
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    alignment: num ? AlignmentType.LEFT : AlignmentType.CENTER,
    pageBreakBefore: newPage,
    spacing: { line: 360, before: 0, after: 360 },
    keepNext: true,
  });
}
function H2(num, title) {
  const text = `${num} ${title}`;
  headings.push({ level: 2, num, title, text });
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    alignment: AlignmentType.LEFT,
    spacing: { line: 360, before: 360, after: 360 },
    keepNext: true,
  });
}
// título sem indicativo (pré-textuais), não entra no sumário
const Tcenter = (text, pageBreak = true) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true })],
    alignment: AlignmentType.CENTER,
    pageBreakBefore: pageBreak,
    spacing: { line: 360, after: 360 },
  });

// alíneas a), b), c)
const numberingConfigs = [];
let listN = 0;
function alineas(items) {
  const ref = `al${++listN}`;
  numberingConfigs.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1)", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: INDENT + 425, hanging: 425 } } } }],
  });
  return items.map((t, i) =>
    new Paragraph({
      numbering: { reference: ref, level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360 },
      children: runs(t + (i < items.length - 1 ? ";" : ".")),
    })
  );
}

// ---------------------------------------------------------------- figuras, tabelas, quadros
const small = { size: 20 };
const caption = (text, align = AlignmentType.CENTER) =>
  new Paragraph({ alignment: align, keepNext: true, spacing: { before: 240, after: 60, line: 240 }, children: runs(text, small) });
const fonte = (align = AlignmentType.CENTER) =>
  new Paragraph({ alignment: align, spacing: { before: 60, after: 240, line: 240 }, children: [new TextRun({ text: `Fonte: elaborado pelo autor (${ANO}).`, size: 20 })] });

let figN = 0;
function figure(file, title, widthPx = 600) {
  const b = fs.readFileSync(path.join(DIR, file));
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  figN++;
  return [
    caption(`Figura ${figN} – ${title}`),
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true,
      children: [new ImageRun({ type: "png", data: b, transformation: { width: widthPx, height: Math.round((widthPx * h) / w) },
        altText: { title, description: title, name: file } })],
    }),
    fonte(),
  ];
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

function grid(headers, rows, widths, kind, opts = {}) {
  const sum = widths.reduce((a, b) => a + b, 0);
  const w = widths.map((x) => Math.floor((x / sum) * TEXT_W));
  w[w.length - 1] += TEXT_W - w.reduce((a, b) => a + b, 0);
  const isTab = kind === "tabela";
  const cellBorders = (ri, last) =>
    isTab
      ? { left: none, right: none, top: ri === -1 ? thin : none, bottom: ri === -1 || last ? thin : none }
      : { left: thin, right: thin, top: thin, bottom: thin };
  const mk = (txt, width, o) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: o.borders,
      shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 50, bottom: 50, left: 90, right: 90 },
      verticalAlign: VerticalAlign.CENTER,
      children: (Array.isArray(txt) ? txt : [txt]).map((t) =>
        new Paragraph({ alignment: o.align, keepNext: o.keepNext, spacing: { line: 240 }, children: runs(t, { size: 20, bold: o.bold }) })),
    });
  const keep = opts.keep !== false && rows.length <= 12;
  const trs = [
    new TableRow({ tableHeader: true, cantSplit: true,
      children: headers.map((h, i) => mk(h, w[i], { borders: cellBorders(-1, false), bold: true, align: AlignmentType.CENTER,
        fill: isTab ? undefined : "E7E6E6", keepNext: true })) }),
    ...rows.map((r, ri) =>
      new TableRow({ cantSplit: true,
        children: r.map((c, i) => mk(c, w[i], { borders: cellBorders(ri, ri === rows.length - 1),
          bold: opts.boldFirst && i === 0,
          align: opts.center && opts.center.includes(i) ? AlignmentType.CENTER : AlignmentType.LEFT,
          keepNext: keep && ri < rows.length - 1 })) })),
  ];
  return new Table({ width: { size: TEXT_W, type: WidthType.DXA }, columnWidths: w, rows: trs, layout: TableLayoutType.FIXED });
}
let tabN = 0, quaN = 0;
const tabela = (title, h, r, w, o) => [caption(`Tabela ${++tabN} – ${title}`), grid(h, r, w, "tabela", o), fonte(AlignmentType.LEFT)];
const quadro = (title, h, r, w, o) => [caption(`Quadro ${++quaN} – ${title}`), grid(h, r, w, "quadro", o), fonte(AlignmentType.LEFT)];

// ---------------------------------------------------------------- CAPA
const C = (t, o = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360 }, children: [new TextRun({ text: t, bold: o.bold !== false, size: o.size || 24 })] });
const capa = [
  C("NOME DA INSTITUIÇÃO"),
  C("NOME DO CURSO OU DA DISCIPLINA", { bold: false }),
  blank(), blank(), blank(),
  C("NOME DO AUTOR"),
  ...Array(8).fill(0).map(() => blank()),
  C("REDESENHO DO PROCESSO DE LICENÇA ESPECIAL:"),
  C("mapeamento SIPOC, diagnóstico e proposta de reprocessamento", { bold: false }),
  ...Array(13).fill(0).map(() => blank()),
  C("CIDADE", { bold: false }),
  C(ANO, { bold: false }),
];

// ---------------------------------------------------------------- FOLHA DE ROSTO
const rosto = [
  C("NOME DO AUTOR"),
  ...Array(9).fill(0).map(() => blank()),
  C("REDESENHO DO PROCESSO DE LICENÇA ESPECIAL:"),
  C("mapeamento SIPOC, diagnóstico e proposta de reprocessamento", { bold: false }),
  blank(), blank(),
  new Paragraph({
    indent: { left: 4536 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 240 },
    children: [new TextRun({ text: "Trabalho acadêmico apresentado à NOME DA INSTITUIÇÃO, na disciplina NOME DA DISCIPLINA, como requisito parcial para aprovação.", size: 22 })],
  }),
  blank(),
  new Paragraph({ indent: { left: 4536 }, spacing: { line: 240 }, children: [new TextRun({ text: "Orientador(a): __________________", size: 22 })] }),
  ...Array(9).fill(0).map(() => blank()),
  C("CIDADE", { bold: false }),
  C(ANO, { bold: false }),
];

// ---------------------------------------------------------------- RESUMO
const resumo = [
  Tcenter("RESUMO"),
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 360 },
    children: runs("Este trabalho analisa e redesenha o processo pelo qual o aspirante goza a licença especial, benefício já concedido que só pode ser usufruído a partir das 17h00, após o cumprimento da rotina. No modelo atual, o aspirante confecciona uma papeleta e percorre, em série, quatro assinaturas (Comandante de Pelotão, Comandante de Companhia e Encarregado de Papeleta, todos aspirantes, e Comandante de Companhia oficial), o que consome parte relevante das cerca de duas horas livres diárias do aspirante do primeiro ano e gera interrupções frequentes aos oficiais. Com base no mapeamento SIPOC, na análise de valor agregado e na identificação dos desperdícios segundo a filosofia enxuta, propõe-se um processo em que o aspirante registra um único pedido e a companhia aprova, uma vez por dia e em lote, uma Relação Diária de Licença Especial (RDLE), conferida por planilha e encaminhada à Polícia para controle da saída. O trabalho apresenta ainda a matriz de responsabilidades, as regras e exceções, as ferramentas de apoio, os indicadores, o plano de implantação e os riscos. Estima-se que o tempo gasto pelo aspirante caia de 20 a 60 minutos para cerca de 2 minutos por pedido, sem perda de controle e com preservação da cadeia de comando."),
  }),
  blank(),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 360 },
    children: runs("**Palavras-chave:** melhoria de processos; SIPOC; gestão enxuta; licença especial; organização militar.") }),
];

// ================================================================ TEXTO
const t1 = [
  H1("1", "Introdução", false),
  P("A formação do aspirante em uma escola militar ocorre sob uma rotina intensa, com horários definidos para instrução, atividades acadêmicas, treinamento físico e serviços. Nesse contexto, o tempo livre é um recurso escasso: o aspirante do primeiro ano dispõe, em média, de cerca de duas horas livres por dia, com variação de uma hora para mais ou para menos. É nesse intervalo que ele estuda, descansa e resolve assuntos pessoais, o que torna qualquer demanda burocrática uma concorrente direta dessas necessidades."),
  P("A licença especial é um benefício já concedido ao aspirante, que só pode ser usufruído a partir das 17h00, após o término da rotina. Para gozá-la, porém, o aspirante precisa confeccionar uma papeleta e obter, em sequência, quatro assinaturas: a do Comandante de Pelotão (ComPel), a do Comandante de Companhia (ComCia) e a do Encarregado de Papeleta, todos aspirantes, e, por fim, a do Comandante de Companhia oficial (Tenente). Na prática, um procedimento que deveria apenas confirmar um direito existente transforma-se em uma sequência de deslocamentos e esperas, com custo alto para o aspirante e interrupções recorrentes para quem assina."),
  P("Este trabalho propõe o redesenho desse processo. A ideia central é substituir a papeleta individual por um **pedido único**, registrado pelo aspirante em cerca de dois minutos, e por uma **Relação Diária de Licença Especial (RDLE)** por companhia, conferida por planilha e aprovada em lote pelo oficial uma vez por dia. Como a licença só começa às 17h00, todo o trâmite pode ocorrer durante a rotina, em paralelo às demais atividades, sem que o aspirante precise se deslocar."),
  P("Por se tratar de uma organização militar, a proposta não busca apenas rapidez. Ela preserva a autoridade do oficial, que continua sendo quem autoriza, mantém o Comandante de Pelotão informado e com poder de veto, e aumenta o controle sobre quem sai e quem permanece, pois a Polícia passa a conferir a saída por uma relação oficial e única. Eficiência e disciplina, aqui, caminham juntas."),

  H2("1.1", "Contexto e premissas"),
  P("O redesenho partiu de quatro premissas, que orientam todas as decisões apresentadas nas seções seguintes:"),
  ...alineas([
    "a licença especial é um direito **já concedido**; o processo não avalia se o aspirante a merece, apenas verifica se ele pode gozá-la naquele dia, isto é, se possui saldo e se não há impedimento",
    "a licença **só pode ser gozada a partir das 17h00**; logo, não há urgência operacional antes desse horário, e existe uma janela de várias horas em que a verificação pode ser feita sem prejuízo a ninguém",
    "o tempo livre do aspirante do primeiro ano, de **cerca de duas horas diárias**, é o recurso mais escasso do sistema e deve ser protegido",
    "a **cadeia de comando** e o controle de efetivo não podem ser enfraquecidos; qualquer simplificação precisa manter, ou melhorar, a segurança do processo",
  ]),
  P("A estrutura envolvida é apresentada na Tabela 1. Ela mostra que o processo atravessa todos os níveis de comando da companhia e que, a cada pedido, quatro pessoas diferentes precisam ser encontradas."),
  ...tabela("Estrutura envolvida no processo de licença especial", ["Elemento", "Quantidade", "Papel no processo atual"], [
    ["Companhias", "6", "Controle da licença"],
    ["Pelotões", "18 (3 por companhia)", "Enquadramento do aspirante"],
    ["Comandantes de Pelotão – ComPel (Asp)", "18", "1ª assinatura"],
    ["Comandantes de Companhia – ComCia (Asp)", "6", "2ª assinatura"],
    ["Encarregados de Papeleta (Asp)", "6 (um por companhia)", "3ª assinatura"],
    ["Comandantes de Companhia – ComCia (Tenente)", "6", "4ª assinatura (autoridade que autoriza)"],
  ], [3.4, 1.7, 2.9], { center: [1] }),
  P("Essa escala ajuda a dimensionar o problema. Se cada companhia recebe, por exemplo, quinze pedidos em um dia, as seis companhias somam noventa papeletas e trezentas e sessenta assinaturas diárias, cada uma exigindo que duas pessoas se encontrem no mesmo lugar e na mesma hora. O esforço não está na assinatura, que dura segundos, mas na coordenação necessária para obtê-la."),

  H2("1.2", "Processo atual (AS-IS)"),
  P("O processo atual começa quando o aspirante que deseja licenciar **confecciona a papeleta**, preenchendo seus dados e a data pretendida. A partir daí, ele passa a ser o responsável por conduzir o documento, pessoalmente, por quatro assinantes, sempre na mesma ordem:"),
  ...alineas([
    "**Comandante de Pelotão (Asp)**: confirma que não há óbice no pelotão, como uma tarefa pendente ou uma escala interna",
    "**Comandante de Companhia (Asp)**: tem a visão da companhia e verifica, em tese, a mesma informação em um nível acima",
    "**Encarregado de Papeleta (Asp)**: registra a licença e confere o saldo, embora, na prática, também atue como mais uma assinatura",
    "**Comandante de Companhia (Tenente)**: é a autoridade que efetivamente autoriza a saída",
  ]),
  P("Somente com as quatro assinaturas a papeleta está completa, e o aspirante pode apresentá-la à Polícia para sair a partir das 17h00. Nenhuma etapa pode começar antes que a anterior termine, e não há horário definido para que cada assinante esteja disponível. O processo tem, portanto, quatro características que explicam a maior parte do desgaste: é **sequencial**, **presencial**, **individual**, pois cada papeleta segue sozinha, e **sem horário-padrão**."),
  ...figure("fig1_processo_atual.png", "Processo atual (AS-IS)", 600),
  P("Na leitura da Figura 1, os quadros azuis representam as quatro assinaturas e os quadros vermelhos, o tempo que o aspirante gasta para localizar cada assinante e aguardar sua disponibilidade. Estima-se que cada assinatura consuma de 5 a 15 minutos, o que resulta em 20 a 60 minutos por pedido. A seta tracejada representa o retrabalho: quando um assinante está em aula, em serviço ou fora da companhia, ou quando a papeleta apresenta erro, o aspirante precisa voltar em outro horário, repetindo o deslocamento."),
  P("Comparado ao tempo livre disponível, o impacto é evidente. Em um dia comum, com duas horas livres, o processo pode consumir de 17% a 50% desse tempo; em um dia com apenas uma hora livre, pode consumi-lo por inteiro. Além disso, o resultado é incerto até o último momento: o aspirante só sabe se vai licenciar quando obtém a quarta assinatura, o que dificulta o planejamento pessoal."),
  P("Para organizar a visão do processo como um todo, utilizou-se o diagrama SIPOC, sigla em inglês para fornecedores, entradas, processo, saídas e clientes. A ferramenta, usada em programas de melhoria como o Seis Sigma, delimita o processo e evidencia quem fornece o quê e a quem se destinam os resultados (PYZDEK; KELLER, 2010). A Figura 2 apresenta o SIPOC do processo atual."),
  ...figure("fig2_sipoc_atual.png", "Diagrama SIPOC do processo atual", 600),
  P("Dois pontos chamam a atenção na Figura 2. O primeiro é que o aspirante aparece ao mesmo tempo como fornecedor e como cliente: é ele quem inicia o processo, quem o conduz de assinatura em assinatura e quem recebe o resultado, arcando sozinho com o custo de coordenação. O segundo é que, entre as saídas, figura um resultado indesejado, o consumo do tempo livre e as interrupções dos oficiais, que não agrega valor a nenhum cliente. Esses dois pontos orientam o diagnóstico da Seção 2."),

  H2("1.3", "Objetivos"),
  P("O objetivo geral deste trabalho é redesenhar o processo de gozo da licença especial de forma a reduzir o tempo e o esforço exigidos do aspirante e dos oficiais, preservando o controle e a cadeia de comando. Para alcançá-lo, foram definidos os seguintes objetivos específicos:"),
  ...alineas([
    "diagnosticar o processo atual, identificando as etapas que agregam valor, os desperdícios e suas causas",
    "propor um novo fluxo, com papéis, horários, regras e tratamento de exceções",
    "definir ferramentas simples de apoio, com alternativa física para falhas",
    "estabelecer indicadores, um plano de implantação e as ações de mitigação de riscos",
  ]),

  H2("1.4", "Metodologia e estrutura do trabalho"),
  P("Trata-se de um estudo de caso de natureza qualitativa, apoiado em ferramentas consagradas de gestão de processos. O processo foi mapeado em sua forma atual (AS-IS) e em sua forma proposta (TO-BE), com o auxílio do diagrama SIPOC. As etapas foram classificadas quanto ao valor agregado e analisadas à luz dos desperdícios descritos pelo Sistema Toyota de Produção (OHNO, 1997) e pela mentalidade enxuta (WOMACK; JONES, 2004). O redesenho adota a lógica da reengenharia, que propõe repensar o processo a partir do resultado desejado, e não apenas automatizar o que já existe (HAMMER; CHAMPY, 1994). A implantação segue o ciclo PDCA, amplamente usado no gerenciamento da rotina (CAMPOS, 2004)."),
  P("Os tempos citados são estimativas e devem ser confirmados por cronometragem durante o piloto previsto na Seção 5. Após esta introdução, a Seção 2 apresenta o diagnóstico do processo atual; a Seção 3 descreve o processo proposto; a Seção 4 detalha as ferramentas de apoio; a Seção 5 trata da implantação e do acompanhamento; e a Seção 6 reúne os resultados esperados e as conclusões."),
];

const t2 = [
  H1("2", "Diagnóstico do processo atual"),
  P("Descrito o processo atual, cabe entender por que ele é lento e desgastante. O diagnóstico foi feito em três passos complementares: a análise de cada etapa quanto ao valor que agrega, a identificação dos desperdícios presentes no fluxo e, por fim, a busca das causas que explicam esses desperdícios."),

  H2("2.1", "Análise de valor agregado por etapa"),
  P("Na perspectiva enxuta, uma atividade agrega valor quando contribui diretamente para o resultado que o cliente espera (WOMACK; JONES, 2004). Neste caso, o resultado é liberar o aspirante com segurança, o que exige responder a quatro perguntas: ele tem saldo? Está impedido? A autoridade competente autorizou? A Polícia sabe quem pode sair? O Quadro 1 confronta cada etapa atual com essas perguntas."),
  ...quadro("Análise de valor das etapas do processo atual", ["Etapa atual", "Agrega valor?", "O que realmente importa", "Decisão no redesenho"], [
    ["Confeccionar a papeleta", "Não", "Registrar a intenção de licenciar", "Substituir por pedido eletrônico ou Livro de Pedidos"],
    ["Assinatura do ComPel (Asp)", "Parcial", "Saber se há impedimento no pelotão", "Transformar em ciência com veto por exceção"],
    ["Assinatura do ComCia (Asp)", "Parcial", "Visão consolidada da companhia", "Manter como visto único na relação"],
    ["Assinatura do Encarregado de Papeleta", "Não, como assinatura", "Controle de saldo e registro", "Eliminar a assinatura e fortalecer a função de controle"],
    ["Assinatura do ComCia (Tenente)", "Sim", "Autorização da autoridade", "Manter, uma vez por dia, em lote"],
    ["Apresentação da papeleta à Polícia", "Parcial", "Saber quem pode sair", "Enviar a relação aprovada à Polícia"],
  ], [2.5, 1.3, 2.5, 3], { boldFirst: true, center: [1] }),
  P("O quadro mostra que apenas a assinatura do Tenente agrega valor por si só, pois representa a decisão da autoridade. As demais etapas têm um núcleo útil, a verificação de impedimentos, o controle de saldo e a informação à Polícia, mas esse núcleo não depende de uma assinatura individual em cada papeleta. Ele pode ser obtido de forma consolidada, por exceção e sem deslocamentos. A etapa do Encarregado de Papeleta ilustra bem a distorção: uma função que deveria ser de controle foi reduzida a mais um carimbo."),

  H2("2.2", "Desperdícios identificados"),
  P("Ohno (1997) classifica como desperdício toda atividade que consome recursos sem gerar valor, e a literatura enxuta costuma agrupá-los em oito tipos. O Quadro 2 mostra como cada um deles aparece no processo de licença especial."),
  ...quadro("Desperdícios no processo atual", ["Desperdício", "Como aparece no processo", "Consequência"], [
    ["Espera", "Aspirante aguardando o assinante; papeleta parada entre assinaturas", "Tempo livre consumido; ciclo imprevisível"],
    ["Movimentação", "Idas e vindas até quatro pessoas, às vezes mais de uma vez", "Cansaço e perda de tempo livre"],
    ["Superprocessamento", "Quatro pessoas verificam, sem critério escrito, praticamente a mesma coisa", "Redundância sem ganho de controle"],
    ["Defeitos e retrabalho", "Papeleta rasurada, perdida ou assinada fora de ordem", "Recomeço do circuito"],
    ["Estoque", "Papeletas acumuladas aguardando o próximo assinante", "Assinante sobrecarregado nos picos"],
    ["Transporte", "Documento físico circulando de mão em mão", "Risco de extravio; nenhuma rastreabilidade"],
    ["Talento não utilizado", "Oficiais e aspirantes-líderes usados como carimbadores", "Menos tempo para comando, instrução e estudo"],
    ["Superprodução", "Uma papeleta impressa e preenchida por pedido", "Papel e arquivo sem uso gerencial"],
  ], [2, 3.6, 2.6], { boldFirst: true }),
  P("Embora todos os desperdícios estejam presentes, a espera e a movimentação são os mais graves, porque incidem diretamente sobre o tempo livre do aspirante. O superprocessamento, por sua vez, explica por que tantas pessoas participam de uma decisão simples: sem critérios escritos, cada nível repete a verificação do anterior por precaução."),

  H2("2.3", "Causas-raiz"),
  P("Os desperdícios do Quadro 2 são sintomas. A análise permitiu identificar cinco causas que os explicam e que precisam ser atacadas para que a melhoria seja duradoura:"),
  ...alineas([
    "**controle baseado em documento individual e físico**: cada pedido gera um papel que precisa circular, e o volume de papéis cresce com o número de pedidos",
    "**aprovação sequencial**: as verificações acontecem uma após a outra, quando poderiam ser consolidadas em uma única relação",
    "**ausência de critérios objetivos**: não há uma lista escrita do que impede a licença, o que leva todos a verificarem tudo",
    "**ônus da coordenação no solicitante**: quem tem menos tempo, o aspirante, é quem precisa conciliar as agendas de quatro pessoas",
    "**falta de horários-padrão**: sem prazos fixos, cada pedido é tratado quando o assinante é encontrado, e não em um momento previsto",
  ]),
  P("Essas causas indicam que ajustes pontuais, como pedir aos assinantes que fiquem mais disponíveis, não resolveriam o problema. É preciso mudar a lógica do processo, o que é feito na Seção 3."),
];

const t3 = [
  H1("3", "Processo proposto (TO-BE)"),
  P("O processo proposto responde diretamente às causas-raiz identificadas. Em vez de um documento que percorre pessoas, passa a existir uma informação que percorre etapas com horário marcado. Esta seção apresenta os princípios que orientaram o redesenho, as etapas e seus horários, o fluxo com a matriz de responsabilidades, o SIPOC resultante, as regras e o tratamento das exceções."),

  H2("3.1", "Princípios do redesenho"),
  P("Sete princípios guiaram as escolhas do novo processo. Cada um deles se relaciona a uma ou mais causas-raiz da Seção 2.3:"),
  ...alineas([
    "**o aspirante pede uma vez e não se desloca**: quem circula é a informação, o que elimina a espera e a movimentação",
    "**aprovar em lote, e não por unidade**: uma relação por companhia por dia substitui dezenas de papeletas e acaba com a aprovação sequencial individual",
    "**gestão por exceção**: só se manifesta quem tem objeção, e o silêncio no prazo equivale a concordância, o que reduz o superprocessamento",
    "**critérios objetivos e escritos**: saldo e impedimentos são conferidos por planilha, com base em listas oficiais, e não na memória de quatro pessoas",
    "**horários-padrão dentro da rotina**: como a licença só começa às 17h00, o trâmite corre durante o dia, com resposta garantida às 16h30",
    "**preservação da cadeia de comando**: a decisão final permanece com o Tenente, e os aspirantes com função de comando continuam informados e com poder de veto",
    "**contingência física sempre disponível**: se faltar sistema, sinal ou equipamento, o processo continua em papel, com os mesmos horários",
  ]),
  P("Os dois primeiros princípios atacam a forma do processo; o terceiro e o quarto, o conteúdo das verificações; o quinto, o tempo; e os dois últimos garantem que a mudança seja segura e aceitável em uma organização militar."),

  H2("3.2", "Etapas e horários"),
  P("O novo processo gira em torno da **Relação Diária de Licença Especial (RDLE)**, documento único gerado uma vez por dia por companhia. A função de Encarregado de Papeleta passa a se chamar **Encarregado de Licenças**, e deixa de ser uma assinatura para se tornar a responsável pelo controle do processo. O Quadro 3 descreve as etapas, os responsáveis e os prazos."),
  ...quadro("Etapas do processo proposto", ["Etapa", "Responsável", "Prazo", "Descrição", "Tempo"], [
    ["1. Registrar o pedido", "Aspirante", "Até 12h30 (pode ser feito até 7 dias antes)", "Preenche o formulário ou, na contingência, o Livro de Pedidos da companhia", "≈ 2 min"],
    ["2. Consolidar e conferir", "Encarregado de Licenças", "12h30–13h30", "A planilha cruza cada nome com o saldo, a escala e os impedimentos e gera a RDLE", "15–20 min/dia"],
    ["3. Dar ciência", "ComPel (Asp)", "Até 14h00", "Confere o pelotão e só se manifesta se houver impedimento, com motivo", "≈ 2 min/dia"],
    ["4. Validar", "ComCia (Asp)", "Até 15h00", "Revisa a relação, resolve pendências e dá o visto único", "≈ 5 min/dia"],
    ["5. Aprovar", "ComCia (Tenente)", "Até 16h00", "Aprova a relação inteira de uma vez; pode excluir nomes, com motivo", "≈ 5 min/dia"],
    ["6. Publicar", "Encarregado de Licenças", "16h30", "Divulga o resultado aos aspirantes e envia a RDLE à Polícia", "≈ 5 min"],
    ["7. Licenciar", "Aspirante e Polícia", "A partir das 17h00", "A Polícia confere nome e identidade e registra saída e regresso", "< 1 min"],
    ["8. Baixar o saldo", "Encarregado de Licenças", "Dia seguinte, até 08h00", "Debita o saldo de quem efetivamente saiu e atualiza os indicadores", "≈ 5 min"],
  ], [1.7, 1.5, 1.7, 3.4, 1], { center: [4] }),
  P("Os horários foram escolhidos para caber na rotina e deixar folga entre as etapas. O corte às 12h30 coincide com o fim do horário de almoço, período em que o aspirante costuma ter acesso ao celular. Cada responsável dispõe de cerca de uma hora para agir, o que permite encaixar a tarefa entre outras atividades, e a publicação às 16h30 dá ao aspirante meia hora para se preparar antes da liberação."),

  H2("3.3", "Fluxo e responsabilidades"),
  P("A Figura 3 mostra o fluxo em raias, com uma coluna para cada participante e o tempo correndo de cima para baixo. Na sequência, o Quadro 4 apresenta a matriz de responsabilidades (RACI) correspondente."),
  ...figure("fig3_processo_proposto.png", "Fluxo do processo proposto (TO-BE)", 600),
  ...quadro("Matriz de responsabilidades (RACI) do processo proposto", ["Atividade", "Aspirante", "Enc. de Licenças", "ComPel (Asp)", "ComCia (Asp)", "ComCia (Ten)", "Polícia"], [
    ["Registrar o pedido", "R/A", "I", "", "", "", ""],
    ["Manter o saldo atualizado", "I", "R", "", "A", "", ""],
    ["Consolidar e conferir (gerar a RDLE)", "", "R", "I", "A", "", ""],
    ["Dar ciência e vetar por exceção", "", "I", "R", "A", "", ""],
    ["Validar a RDLE", "", "C", "C", "R", "A", ""],
    ["Aprovar a RDLE", "", "I", "", "C", "R/A", ""],
    ["Publicar e distribuir a RDLE", "I", "R", "I", "A", "I", "I"],
    ["Controlar saída e regresso", "R", "I", "", "", "", "A"],
    ["Baixar o saldo e atualizar os indicadores", "", "R", "", "A", "I", ""],
    ["Tratar exceções", "C", "C", "C", "R", "A", "C"],
  ], [2.6, 1.25, 1.1, 1, 1, 1, 0.9], { center: [1, 2, 3, 4, 5, 6] }),
  P("Na Figura 3, cada quadro indica o que o participante faz naquele horário. O quadro tracejado do ComPel destaca que sua participação é por exceção, e a linha horizontal marca as 17h00, fim da rotina: tudo o que está acima dela ocorre durante o dia, sem exigir deslocamento do aspirante. O aspirante aparece apenas três vezes, para pedir, consultar o resultado e sair."),
  P("No Quadro 4, **R** indica quem executa a atividade, **A** quem responde pelo resultado (um único por atividade), **C** quem é consultado e **I** quem é informado. A matriz evidencia a nova divisão de papéis: o Encarregado de Licenças concentra a execução, o ComCia (Asp) responde pela qualidade da relação, e o Tenente mantém a responsabilidade final pela aprovação e pelas exceções. Nenhuma atividade fica sem dono, o que era uma fragilidade do modelo anterior."),

  H2("3.4", "SIPOC do processo proposto"),
  P("A Figura 4 apresenta o SIPOC do novo processo, que pode ser comparado diretamente com o da Figura 2."),
  ...figure("fig4_sipoc_proposto.png", "Diagrama SIPOC do processo proposto", 600),
  P("A comparação mostra três mudanças relevantes. Entre os fornecedores e as entradas surgem fontes oficiais, como a escala de serviço e a relação de impedidos, que substituem o conhecimento informal. Entre as saídas, desaparece o consumo do tempo livre e surgem produtos úteis à gestão, como a lista de controle da Polícia, o saldo atualizado e os indicadores. Por fim, o aspirante deixa de ser o condutor do processo e passa a ser apenas quem inicia o pedido e recebe o resultado."),

  H2("3.5", "Regras do processo"),
  P("Para que o novo fluxo funcione de modo uniforme nas seis companhias, as regras abaixo devem ser formalizadas em norma interna, cuja minuta consta do Apêndice A:"),
  ...alineas([
    "a licença especial só pode ser gozada a partir das 17h00, e nenhuma etapa do processo exige deslocamento do aspirante",
    "o pedido é único, feito pelo próprio aspirante até as 12h30 do dia pretendido, podendo ser registrado com até sete dias de antecedência",
    "a autorização é dada por relação de companhia, nunca por papeleta individual",
    "o ComPel (Asp) dá ciência até as 14h00, e a ausência de manifestação no prazo equivale a concordância; todo veto deve ter motivo registrado",
    "os únicos motivos de negação são a falta de saldo, a escala de serviço, o impedimento disciplinar, a pendência determinada pelo comando e a decisão fundamentada do Tenente",
    "o aspirante pode cancelar o pedido até as 16h00 sem débito de saldo",
    "só licencia quem consta na RDLE aprovada, mediante apresentação de identidade à Polícia",
    "o saldo é debitado somente quando a saída é efetivamente registrada",
    "na ausência do Tenente ou do Encarregado, atuam os substitutos previamente designados",
    "horário de regresso e demais condições da licença permanecem conforme as normas vigentes",
  ]),
  P("A regra que lista os motivos de negação merece destaque, pois é ela que dá objetividade ao processo. Com critérios fechados, a conferência pode ser feita por planilha e as decisões ficam mais transparentes e menos sujeitas a interpretação pessoal."),

  H2("3.6", "Tratamento de exceções"),
  P("Nenhum processo elimina todos os imprevistos. O importante é que as exceções tenham tratamento previsto e responsável definido, para não se transformarem em improviso. O Quadro 5 reúne as situações mais prováveis."),
  ...quadro("Exceções e respectivo tratamento", ["Situação", "Tratamento", "Quem decide"], [
    ["Pedido após as 12h30, com motivo justificado", "Inclusão em relação complementar; após as 16h00, o caso vai ao Oficial de Serviço", "ComCia (Ten) ou Oficial de Serviço"],
    ["Impedimento surgido após a aprovação", "Retirada do nome da RDLE, com aviso ao aspirante e à Polícia; vale a última versão publicada", "ComCia (Asp)"],
    ["Desistência do aspirante", "Cancelamento até as 16h00; o saldo não é debitado", "Aspirante"],
    ["Atividade de rotina estendida após as 17h00", "A saída ocorre após o término da atividade; a RDLE continua válida", "Oficial de Serviço"],
    ["Ausência do Tenente", "Aprovação pelo substituto designado", "Comando do Corpo de Aspirantes"],
    ["Ausência do Encarregado de Licenças", "Execução pelo auxiliar designado", "ComCia (Asp)"],
    ["Sistema ou internet indisponível", "Livro de Pedidos e RDLE manuscrita, com os mesmos horários", "Encarregado de Licenças"],
    ["Divergência de saldo", "Vale o registro da planilha; contestação ao ComCia (Asp) em até dois dias", "ComCia (Asp)"],
    ["Veto do ComPel contestado", "Decisão do ComCia (Asp) e, persistindo, do Tenente", "ComCia (Asp) e ComCia (Ten)"],
  ], [2.6, 3.9, 2], { boldFirst: true }),
  P("Os pedidos fora do prazo exigem atenção especial. Se se tornarem frequentes, esvaziam o horário de corte e trazem de volta a lógica do atendimento individual. Por isso, são acompanhados por indicador próprio, apresentado na Seção 5.1."),
];

const t4 = [
  H1("4", "Ferramentas de apoio"),
  P("O processo proposto pode ser operado com ferramentas simples e gratuitas, como formulários e planilhas eletrônicas, ou com o sistema institucional, se houver. O ponto essencial é o método; a ferramenta apenas o sustenta. Esta seção descreve o formulário de pedido, a planilha de controle, o modelo da RDLE e o plano de contingência."),

  H2("4.1", "Formulário de pedido"),
  P("O formulário é a única interação obrigatória do aspirante com o processo e, por isso, deve ser curto. O Quadro 6 relaciona os campos sugeridos."),
  ...quadro("Campos do formulário de pedido", ["Campo", "Tipo", "Observação"], [
    ["Data e hora do pedido", "Automático", "Registrado pelo sistema"],
    ["Número e nome de guerra", "Lista", "Lista suspensa evita erros de digitação"],
    ["Companhia e pelotão", "Lista", "Usado para montar a RDLE e distribuí-la aos ComPel"],
    ["Data(s) pretendida(s)", "Data múltipla", "Permite agendar até sete dias à frente"],
    ["Telefone de contato", "Texto", "Contato durante a licença, por segurança"],
    ["Cancelamento", "Sim ou não", "Usado para desistência até as 16h00"],
    ["Declaração de ciência das normas", "Caixa de seleção", "Reforça a responsabilidade do aspirante"],
  ], [2.6, 1.7, 4], { boldFirst: true }),
  P("Com esses campos, o preenchimento leva cerca de dois minutos. A possibilidade de agendar vários dias de uma vez reduz ainda mais o esforço de quem pretende usar a licença com regularidade."),

  H2("4.2", "Planilha de controle"),
  P("A planilha é o núcleo do controle e deve existir uma por companhia, com edição restrita ao Encarregado de Licenças e ao ComCia (Asp). O Quadro 7 descreve sua organização."),
  ...quadro("Organização da planilha de controle", ["Aba", "Conteúdo", "Origem dos dados"], [
    ["Pedidos", "Respostas do formulário", "Formulário (automático)"],
    ["Saldo", "Número, nome, pelotão, licenças concedidas, gozadas e saldo", "Encarregado, a partir das concessões publicadas"],
    ["Impedimentos", "Número, data, motivo e fonte", "Escalante e setor disciplinar"],
    ["RDLE", "Relação do dia, com a situação de cada pedido", "Fórmulas (automático)"],
    ["Polícia", "Número, hora de saída e hora de regresso", "Polícia ou transcrição da RDLE"],
    ["Indicadores", "Painel com os indicadores da Seção 5.1", "Fórmulas (automático)"],
  ], [1.6, 3.9, 2.8], { boldFirst: true }),
  P("A situação de cada pedido pode ser calculada por fórmula, sem intervenção manual. Em uma planilha em português, em que B2 contém o número do aspirante e H1 a data do dia, a fórmula abaixo retorna o resultado da conferência:"),
  new Paragraph({ spacing: { line: 240, before: 120, after: 120 }, indent: { left: INDENT },
    children: [new TextRun({ text: "=SE(CONT.SES(Impedimentos!A:A;B2;Impedimentos!B:B;$H$1)>0;\"NEGADO – impedimento\";SE(PROCV(B2;Saldo!A:G;7;FALSO)<=0;\"NEGADO – sem saldo\";\"APTO\"))", font: "Courier New", size: 18 })] }),
  P("A automação é o que torna viável a consolidação em cerca de vinte minutos por dia: o Encarregado não confere pedido por pedido, apenas revisa os casos negados e as situações atípicas."),

  H2("4.3", "Modelo da Relação Diária de Licença Especial"),
  P("A RDLE é o documento que circula no lugar das papeletas. O Quadro 8 apresenta um modelo preenchido com dados fictícios."),
  ...quadro("Modelo de RDLE (dados fictícios)", ["Ord.", "Número e nome de guerra", "Pel.", "Saldo", "Situação", "Motivo", "Saída", "Regresso"], [
    ["1", "0000 – ASP. EXEMPLO A", "1º", "2", "APTO", "–", "17h05", "____"],
    ["2", "0000 – ASP. EXEMPLO B", "1º", "0", "NEGADO", "Sem saldo", "–", "–"],
    ["3", "0000 – ASP. EXEMPLO C", "2º", "1", "NEGADO", "Escalado de serviço", "–", "–"],
    ["4", "0000 – ASP. EXEMPLO D", "3º", "3", "APTO", "–", "____", "____"],
  ], [0.6, 2.6, 0.6, 0.7, 1.1, 1.7, 0.8, 1], { center: [0, 2, 3, 4, 6, 7] }),
  P("No rodapé da relação constam o nome do Encarregado que a consolidou, o visto do ComCia (Asp), a aprovação do Tenente e o horário de publicação. As colunas de saída e regresso são preenchidas pela Polícia, o que transforma a RDLE também em registro de controle do efetivo."),

  H2("4.4", "Plano de contingência"),
  P("Para os casos de falha do sistema ou de falta de acesso ao celular, mantém-se um **Livro de Pedidos** na sala de cada companhia. O aspirante escreve uma linha, com número, nome e data, até as 12h30, o que leva menos de um minuto e não exige encontrar ninguém. O Encarregado transcreve o livro para a planilha ou monta a RDLE à mão, e os horários e responsáveis permanecem os mesmos."),
  P("Para aspirantes sem acesso ao celular durante o dia, recomenda-se fazer o pedido na noite anterior ou agendar a semana. Assim, a contingência deixa de ser uma exceção incômoda e passa a ser uma forma alternativa, igualmente válida, de participar do processo."),
];

const t5 = [
  H1("5", "Implantação e acompanhamento"),
  P("Uma proposta de melhoria só se sustenta se for implantada de forma controlada e acompanhada por dados. Esta seção apresenta os indicadores, o plano de implantação baseado no ciclo PDCA, os riscos e as possibilidades de evolução."),

  H2("5.1", "Indicadores de desempenho"),
  P("Os indicadores foram escolhidos para medir, ao mesmo tempo, a eficiência do processo e a manutenção do controle. O Quadro 9 relaciona cada indicador à sua forma de medição, meta, frequência e responsável."),
  ...quadro("Indicadores de desempenho", ["Indicador", "Como medir", "Meta", "Frequência", "Responsável"], [
    ["Tempo do aspirante por pedido", "Cronometragem por amostra", "≤ 3 min", "Mensal", "ComCia (Asp)"],
    ["Pontualidade da RDLE", "Dias com RDLE publicada até 16h30 ÷ dias do período", "≥ 98%", "Semanal", "Enc. de Licenças"],
    ["Pedidos fora do prazo", "Pedidos após 12h30 ÷ total de pedidos", "≤ 5%", "Semanal", "Enc. de Licenças"],
    ["Negações por motivo", "Pedidos negados ÷ pedidos, por motivo", "Monitorar", "Semanal", "Enc. de Licenças"],
    ["Saídas irregulares", "Saídas sem nome na RDLE aprovada", "Zero", "Diária", "Polícia"],
    ["Erros de saldo", "Divergências apontadas", "Zero", "Mensal", "ComCia (Asp)"],
    ["Satisfação", "Pesquisa de 1 a 5 com aspirantes e oficiais", "≥ 4,0", "Fim do piloto e trimestral", "ComCia (Asp)"],
  ], [2.2, 3, 1.1, 1.4, 1.5], { boldFirst: true, center: [2, 3] }),
  P("Os dois primeiros indicadores medem se o processo cumpre o que promete: pouco esforço do aspirante e resposta no horário. Os indicadores de saídas irregulares e de erros de saldo funcionam como salvaguarda, pois mostram se a simplificação trouxe algum prejuízo ao controle. A taxa de negação não tem meta, mas sua análise por motivo revela problemas de origem, como escalas mal divulgadas."),

  H2("5.2", "Plano de implantação"),
  P("A implantação segue o ciclo PDCA, planejar, executar, verificar e agir, com um piloto em uma única companhia antes da expansão (CAMPOS, 2004). O Quadro 10 apresenta o cronograma."),
  ...quadro("Cronograma de implantação", ["Fase", "Período", "Ações", "Entregável"], [
    ["Aprovação", "Semana 1", "Apresentar a proposta ao Comando do Corpo de Aspirantes; ajustar e publicar a norma (Apêndice A)", "Norma aprovada"],
    ["Planejar (P)", "Semana 2", "Criar formulário e planilha; designar Encarregados e auxiliares; lançar saldos; treinar os envolvidos; medir o tempo atual", "Ferramentas prontas e linha de base medida"],
    ["Executar (D)", "Semanas 3 e 4", "Aplicar o processo em uma companhia; as demais mantêm o processo atual", "Dados do piloto"],
    ["Verificar (C)", "Semana 5", "Comparar com a linha de base e ouvir aspirantes e oficiais", "Relatório ao Comando"],
    ["Agir (A)", "Semanas 6 e 7", "Corrigir o necessário e estender às outras cinco companhias", "Processo em todas as companhias"],
    ["Consolidação", "A partir do 3º mês", "Revisar os indicadores trimestralmente", "Melhoria contínua"],
  ], [1.5, 1.3, 4.2, 2.1], { boldFirst: true }),
  P("O piloto em uma companhia reduz o risco da mudança e produz evidências concretas para o Comando. A medição do tempo atual, feita antes do piloto, é indispensável: sem ela, não há como comprovar os ganhos estimados neste trabalho."),

  H2("5.3", "Riscos e mitigação"),
  P("Toda mudança de processo traz riscos. O Quadro 11 relaciona os principais e as ações previstas para reduzi-los."),
  ...quadro("Riscos e ações de mitigação", ["Risco", "Mitigação"], [
    ["Aspirante sem acesso a celular ou internet no horário do pedido", "Livro de Pedidos; pedido na véspera; agendamento semanal"],
    ["Falha do sistema ou da planilha", "Contingência em papel com os mesmos horários; cópia de segurança diária"],
    ["Inclusão indevida de nome, por erro ou fraude", "Edição restrita; histórico de versões; conferência de identidade pela Polícia; auditoria semanal por amostragem"],
    ["Impedimento que surge depois da aprovação", "Comunicação direta ao Encarregado e à Polícia; vale a última versão da RDLE"],
    ["Sensação de perda de controle pelos oficiais", "Decisão final mantida com o Tenente; veto do ComPel preservado; implantação por piloto com indicadores"],
    ["Ausência do Tenente ou do Encarregado", "Substitutos designados e publicados previamente"],
    ["Sobrecarga do Encarregado", "Planilha automatizada e auxiliar designado"],
    ["Exposição de dados pessoais", "Acesso restrito, coleta apenas do necessário e prazo de guarda definido"],
  ], [3.4, 5], { boldFirst: true }),
  P("O risco mais sensível em uma organização militar é o da sensação de perda de controle. Por isso, a proposta foi desenhada para aumentar, e não reduzir, a informação disponível aos oficiais: a RDLE mostra, em um único documento, todos os aspirantes que pretendem sair, algo que o modelo de papeletas individuais nunca ofereceu."),

  H2("5.4", "Evolução futura"),
  P("Após três meses com os indicadores dentro da meta, o processo pode evoluir de forma gradual. A primeira possibilidade é a aprovação tácita: a RDLE seria publicada automaticamente às 16h00 se não houver veto, e o Tenente passaria a atuar apenas por exceção. Outras melhorias possíveis são a consulta do saldo pelo próprio aspirante, o controle de saída por código QR ou por lista em tablet e a integração com o sistema institucional, se existir."),
  P("O mesmo método, com pedido único, relação diária e gestão por exceção, pode ainda ser aplicado a outros trâmites semelhantes, como dispensas e pernoites, ampliando o ganho para toda a rotina administrativa do Corpo de Aspirantes."),
];

const t6 = [
  H1("6", "Conclusão"),
  P("Este trabalho partiu de uma constatação simples: para gozar um benefício que já possui, o aspirante precisa gastar parte significativa do seu recurso mais escasso, o tempo livre, coletando quatro assinaturas presenciais e sequenciais. O diagnóstico mostrou que apenas uma dessas assinaturas, a do Tenente, agrega valor por si só, e que as demais repetem verificações que podem ser feitas de forma consolidada, por exceção e com critérios objetivos."),
  P("A proposta substitui a papeleta por um pedido único e por uma relação diária aprovada em lote. Como a licença só começa às 17h00, todo o trâmite passa a ocorrer durante a rotina, com horários fixos e resposta garantida às 16h30. A Tabela 2 resume os ganhos esperados em um cenário ilustrativo de quinze pedidos por companhia por dia."),
  ...tabela("Ganhos esperados com o processo proposto (cenário de 15 pedidos por companhia por dia)", ["Indicador", "Processo atual", "Processo proposto", "Variação"], [
    ["Tempo do aspirante por pedido", "20 a 60 min", "≈ 2 min", "−90% a −97%"],
    ["Parcela do tempo livre diário consumida (base de 2 h)", "17% a 50%", "< 2%", "tempo devolvido ao aspirante"],
    ["Deslocamentos do aspirante por pedido", "4 ou mais", "Nenhum", "−100%"],
    ["Assinaturas ou vistos por dia (6 companhias)", "360", "12", "−97%"],
    ["Interrupções do Tenente por dia, por companhia", "≈ 15", "1", "−93%"],
    ["Horas de aspirante gastas por dia (6 companhias)", "30 a 90 h", "≈ 3 h", "−90% a −97%"],
    ["Momento em que o aspirante conhece o resultado", "Somente na 4ª assinatura", "Sempre às 16h30", "previsibilidade"],
  ], [3.5, 1.9, 1.9, 1.7], { center: [1, 2, 3] }),
  P("Os números da Tabela 2 são estimativas e devem ser confirmados pela cronometragem prevista no piloto. Ainda assim, a ordem de grandeza da melhoria é clara, pois decorre da própria estrutura do novo processo: o número de vistos deixa de crescer com o número de pedidos e passa a ser fixo, dois por companhia por dia, independentemente de quantos aspirantes queiram licenciar."),
  P("Os ganhos não se limitam ao tempo. O controle também melhora: a Polícia passa a conferir a saída por uma relação oficial e única, o saldo é debitado com base na saída efetivamente registrada e o Comando ganha indicadores que antes não existiam. A cadeia de comando é preservada, pois o Tenente continua sendo quem autoriza, e os aspirantes com função de comando mantêm participação, agora concentrada no que de fato importa."),
  P("Recomenda-se, portanto, que o Comando: aprove a adoção da RDLE com os horários propostos; redesigne o Encarregado de Papeleta como Encarregado de Licenças, responsável pelo controle do processo; e autorize um piloto de duas semanas em uma companhia, com medição dos indicadores antes da expansão às demais. Mais do que simplificar um trâmite, a proposta mostra que, em uma organização militar, eficiência e disciplina não são objetivos opostos: um processo bem desenhado pode devolver tempo às pessoas e, ao mesmo tempo, aumentar o controle."),
];

// ---------------------------------------------------------------- REFERÊNCIAS
const ref = (t) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 240, after: 240 }, children: runs(t) });
const refs = [
  H1("", "Referências"),
  ref("ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 6023**: informação e documentação: referências: elaboração. Rio de Janeiro: ABNT, 2018."),
  ref("ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 6024**: informação e documentação: numeração progressiva das seções de um documento: apresentação. Rio de Janeiro: ABNT, 2012."),
  ref("ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 6027**: informação e documentação: sumário: apresentação. Rio de Janeiro: ABNT, 2012."),
  ref("ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. **NBR 14724**: informação e documentação: trabalhos acadêmicos: apresentação. Rio de Janeiro: ABNT, 2011."),
  ref("CAMPOS, Vicente Falconi. **Gerenciamento da rotina do trabalho do dia-a-dia**. Nova Lima: INDG Tecnologia e Serviços, 2004."),
  ref("HAMMER, Michael; CHAMPY, James. **Reengenharia**: revolucionando a empresa em função dos clientes, da concorrência e das grandes mudanças da gerência. Rio de Janeiro: Campus, 1994."),
  ref("OHNO, Taiichi. **O Sistema Toyota de Produção**: além da produção em larga escala. Porto Alegre: Bookman, 1997."),
  ref("PYZDEK, Thomas; KELLER, Paul A. **The Six Sigma handbook**: a complete guide for green belts, black belts, and managers at all levels. 3. ed. New York: McGraw-Hill, 2010."),
  ref("WOMACK, James P.; JONES, Daniel T. **A mentalidade enxuta nas empresas**: elimine o desperdício e crie riqueza. Rio de Janeiro: Elsevier, 2004."),
];

// ---------------------------------------------------------------- APÊNDICE
const art = (t) => P(t);
const apendice = [
  H1("", "Apêndice A – Minuta de norma interna"),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 360, after: 240 },
    children: [new TextRun({ text: "NORMA INTERNA Nº ____ – PROCEDIMENTO PARA GOZO DE LICENÇA ESPECIAL", bold: true })] }),
  ...[
    "**Art. 1º** Esta norma regula o procedimento para o gozo da licença especial pelos aspirantes do Corpo de Aspirantes.",
    "**Art. 2º** A licença especial somente poderá ser gozada a partir das 17h00, após o término da rotina diária.",
    "**Art. 3º** O pedido será feito pelo próprio aspirante, uma única vez, no formulário eletrônico ou, na impossibilidade, no Livro de Pedidos da companhia, até as 12h30 do dia pretendido, podendo ser registrado com até sete dias de antecedência.",
    "**Art. 4º** Fica instituída a Relação Diária de Licença Especial (RDLE), documento único por companhia que substitui a papeleta individual.",
    "**Art. 5º** Compete ao Encarregado de Licenças da companhia: I – manter atualizado o saldo de licença especial; II – consolidar os pedidos e gerar a RDLE entre 12h30 e 13h30; III – publicar a RDLE aprovada às 16h30 e encaminhá-la ao Oficial de Serviço e à Polícia; IV – debitar os saldos até as 08h00 do dia seguinte; V – manter os indicadores do processo.",
    "**Art. 6º** Compete ao Comandante de Pelotão (Asp) tomar ciência da RDLE referente ao seu pelotão até as 14h00, manifestando-se apenas em caso de impedimento, sempre com motivo. A ausência de manifestação no prazo implica concordância.",
    "**Art. 7º** Compete ao Comandante de Companhia (Asp) validar a RDLE até as 15h00 e ao Comandante de Companhia (Oficial) aprová-la até as 16h00, podendo excluir nomes mediante motivo.",
    "**Art. 8º** São motivos de negação: I – ausência de saldo; II – escala de serviço; III – impedimento disciplinar; IV – pendência determinada pelo comando; V – decisão fundamentada do Comandante de Companhia (Oficial).",
    "**Art. 9º** Somente poderá licenciar o aspirante que constar da RDLE aprovada, mediante apresentação de identidade à Polícia, que registrará os horários de saída e regresso.",
    "**Art. 10.** O aspirante poderá cancelar o pedido até as 16h00, sem débito de saldo, que será debitado apenas mediante saída efetivamente registrada.",
    "**Art. 11.** Pedidos após o prazo, impedimentos supervenientes e ausências de responsáveis serão tratados conforme o quadro de exceções, cabendo a decisão final ao Comandante de Companhia (Oficial) ou, após as 16h00, ao Oficial de Serviço.",
    "**Art. 12.** Permanecem inalteradas as demais condições da licença especial previstas nas normas vigentes, inclusive quanto ao horário de regresso.",
    "**Art. 13.** Esta norma entra em vigor na data de sua publicação, revogando-se o procedimento de papeleta com quatro assinaturas.",
  ].map(art),
];

// ---------------------------------------------------------------- SUMÁRIO
const textual = [...t1, ...t2, ...t3, ...t4, ...t5, ...t6, ...refs, ...apendice];
const NUM_TAB = 851;
const sumario = [
  Tcenter("SUMÁRIO"),
  ...headings.map((h) => {
    const pg = String(PAGES[h.text] ?? "0");
    const bold = h.level === 1;
    return new Paragraph({
      spacing: { line: 360 },
      tabStops: [{ type: TabStopType.LEFT, position: NUM_TAB }, { type: TabStopType.RIGHT, position: TEXT_W, leader: "dot" }],
      children: [
        new TextRun({ text: h.num ? `${h.num}\t` : "", bold }),
        new TextRun({ text: h.title, bold }),
        new TextRun({ text: `\t${pg}`, bold }),
      ],
    });
  }),
];
fs.writeFileSync(path.join(DIR, "headings.json"), JSON.stringify(headings.map((h) => h.text), null, 1));

// ---------------------------------------------------------------- documento
const page = { size: { width: 11906, height: 16838 }, margin: { top: 1701, left: 1701, bottom: 1134, right: 1134, header: 1134, footer: 709 } };
const numHeader = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] });
const emptyHeader = () => new Header({ children: [new Paragraph({ children: [] })] });

const doc = new Document({
  creator: "Autor",
  title: "Redesenho do processo de licença especial",
  styles: { default: { document: { run: { font: FONT, size: 24 } } } },
  numbering: { config: numberingConfigs },
  sections: [
    { properties: { page }, headers: { default: emptyHeader() }, children: capa },
    { properties: { page: { ...page, pageNumbers: { start: 1 } } }, headers: { default: emptyHeader() }, children: [...rosto, ...resumo, ...sumario] },
    { properties: { page }, headers: { default: numHeader }, children: textual },
  ],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("ok", OUT); });
