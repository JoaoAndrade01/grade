/*
 * siga.js — Regras de leitura dos documentos do SIGA/UFRJ (Histórico e BOA) e
 * montagem do perfil. Funciona no navegador (window.SIGA) e no Node (require).
 *
 * ESTE ARQUIVO É A ESPECIFICAÇÃO EXECUTÁVEL DO IMPORTADOR.
 * O script ferramentas/gerar_perfil.py implementa exatamente as mesmas regras
 * (mesmos nomes de função e mesmas expressões regulares). Ao mudar uma regra
 * aqui, mude lá também e rode ferramentas/testar_paridade.sh.
 *
 * Entrada: "linhas" de texto de cada PDF, já com espaços colapsados
 *          (o navegador extrai com pdf.js; o Python com pypdf em modo layout).
 * Saída:   objeto PERFIL (formato descrito em docs/PERFIL.md).
 *
 * Privacidade: nenhuma regra lê nome, matrícula, CPF, RG, filiação ou endereço.
 * Só são usados códigos de disciplina, créditos, carga horária, grau, situação,
 * períodos e a data de emissão do BOA.
 */
(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.SIGA = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSAO = "1.0";

  // ---------------------------------------------------------------------------
  // Expressões regulares (mantenha idênticas em gerar_perfil.py)
  // ---------------------------------------------------------------------------
  const RE = {
    // Código de disciplina: 3 letras + 3 letras/dígitos (ex.: COS110, EEWZ52)
    codigo: /^[A-Z]{3}[A-Z0-9]{3}$/,
    // Linha do histórico:
    // [período] CÓDIGO Nome CrR CH Grau CrO Pontos SF
    // ex.: "2020/1 EEL170 Computacao I 5.0 90.0 10.0 5.0 50.0 AP"
    //      "MAC248 Cálculo Diferen e Integral IV 4.0 60.0 T 4.0 ***** AP"
    histLinha: /^(?:(\d{4}(?:\/\d)?)\s+)?([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d)\s+([\d.,]+)\s+(\d+(?:\.\d+)?|T|\*+|-+)\s+(\d+\.\d)\s+([\d.,]+|\*+)\s+(AP|RM|RF|RFM|TR|DP|IN|CA)\b/,
    // Linha que só abre um período (ex.: "2025/1 Matrícula Canc Opção Curso")
    histPeriodo: /^(\d{4}(?:\/\d)?)\b/,
    // Origem de uma dispensa ("Disciplina origem da Dispensa:" + "EEL356 NOME")
    origemTitulo: /Disciplina origem da Dispensa:?\s*(.*)$/,
    origemCodigo: /^([A-Z]{3}[A-Z0-9]{3})\b/,
    // BOA — data de emissão (primeira data com hora)
    boaEmissao: /(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/,
    // BOA — linha de disciplina do elenco (obrigatórias / optativas / ACE):
    // CÓDIGO Nome Cred C.H. [Per] RESTO
    boaElenco: /^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d|NCC)\s+(\d+)(?:\s+(\d{1,2}))?\s+(.*)$/,
    // BOA — "Atividades Acadêmicas Cursadas e Não Explicitadas": CÓDIGO Nome Cred CH Grau
    boaNaoExplicitada: /^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d)\s+(\d+)\s+(\d+(?:\.\d+)?|T)$/,
    // BOA — "Frequência de reprovações": CÓDIGO Nome -> N vez(es) P1 P2 ...
    boaReprovacao: /^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s*->\s*(\d+)\s+vez\(es\)\s+(.*)$/,
  };

  /** Colapsa espaços e remove linhas vazias. */
  function normalizarLinhas(texto) {
    const linhas = Array.isArray(texto) ? texto : String(texto).split(/\r?\n/);
    return linhas.map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  }

  const num = (s) => Number(String(s).replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));

  /**
   * Extrai as linhas visuais de um PDF. Cada trecho de texto é projetado na direção da própria
   * escrita (funciona também em páginas giradas, como o BOA em paisagem): trechos com a mesma
   * posição "transversal" formam uma linha, ordenados pela posição "ao longo" do texto.
   */
  async function extrairLinhasPDF(pdfjsLib, data) {
    const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
    const linhas = [];
    try {
      for (let n = 1; n <= doc.numPages; n++) {
        const conteudo = await (await doc.getPage(n)).getTextContent();
        const itens = conteudo.items.filter((i) => i.str && i.str.trim()).map((i) => {
          const [a, b, , , x, y] = i.transform;
          const k = Math.hypot(a, b) || 1, dx = a / k, dy = b / k;
          return { ao: dx * x + dy * y, tr: -dy * x + dx * y, w: i.width, s: i.str };
        }).sort((p, q) => q.tr - p.tr || p.ao - q.ao);
        const grupos = [];
        itens.forEach((i) => {
          const g = grupos[grupos.length - 1];
          if (g && Math.abs(g.tr - i.tr) <= 2.5) g.itens.push(i); else grupos.push({ tr: i.tr, itens: [i] });
        });
        const pagina = grupos.map((g) => {
          g.itens.sort((p, q) => p.ao - q.ao);
          let txt = "", fim = null;
          g.itens.forEach((i) => { txt += (fim != null && i.ao - fim > 0.8 ? " " : "") + i.s; fim = i.ao + i.w; });
          return txt;
        });
        linhas.push(...filtrarPaginaPDF(pagina));
      }
    } finally {
      await doc.destroy();
    }
    return linhas;
  }

  const tituloBOA = /^BOLETIM DE ORIENTA[ÇC][ÃA]O ACAD[ÊE]MICA\b/i;
  const colunasBOA = /^Aluno\s+Matr[íi]cula\b.*\bEmiss[ãa]o\s*$/i;
  const colunasHist = /^Per[íi]odo\s+C[óo]digo\b.*\bCrR\s+CH\s+Grau\s+CrO\s+Pontos\s+SF\b/i;
  const secaoNE = /Cursadas e N[ãa]o Explicitadas/i;
  const secaoElenco = /Atividades Acad[êe]micas (Obrigat[óo]rias|Optativas)/i;
  const secaoReprov = /Frequ[êe]ncia de reprova/i;
  const totalNE = /^Total(:| de Livre)/i;

  /** Conserva somente linhas acadêmicas e a data de emissão em cada página extraída. */
  function filtrarPaginaPDF(texto) {
    const linhas = normalizarLinhas(texto);
    const boa = linhas.findIndex((l) => tituloBOA.test(l));
    if (boa >= 0) {
      const cabecalho = linhas.findIndex((l, i) => i > boa && colunasBOA.test(l));
      if (cabecalho < 0) return [];
      const saida = ["BOLETIM DE ORIENTAÇÃO ACADÊMICA"];
      const emissao = RE.boaEmissao.exec(linhas[cabecalho + 1] || "");
      if (emissao) saida.push(emissao[0]);
      for (const l of linhas.slice(cabecalho + 2)) {
        if (secaoNE.test(l)) saida.push("Cursadas e Não Explicitadas");
        else if (secaoElenco.test(l)) saida.push("Atividades Acadêmicas Obrigatórias");
        else if (secaoReprov.test(l)) saida.push("Frequência de reprovações");
        else if (totalNE.test(l)) saida.push("Total:");
        else if (RE.boaNaoExplicitada.test(l)) saida.push(l);
        else {
          const rp = RE.boaReprovacao.exec(l);
          if (rp) {
            const periodos = rp[4].match(/\d{4}\/\d/g);
            if (periodos) saida.push(l.slice(0, l.length - rp[4].length) + periodos.join(" "));
            continue;
          }
          const el = RE.boaElenco.exec(l);
          if (!el) continue;
          const situacao = /^Cursando\b/i.exec(el[6]) || RE.origemCodigo.exec(el[6]);
          if (situacao) saida.push(l.slice(0, l.length - el[6].length) + situacao[0]);
        }
      }
      return saida;
    }

    const cabecalho = linhas.findIndex((l) => colunasHist.test(l));
    if (cabecalho < 0) return [];
    const saida = [];
    let aguardandoOrigem = false;
    for (const l of linhas.slice(cabecalho + 1)) {
      const registro = RE.histLinha.exec(l);
      if (registro) {
        saida.push(registro[0]);
        aguardandoOrigem = false;
      } else if (/^Disciplina origem da Dispensa:?(?:\s|$)/.test(l)) {
        const codigo = RE.origemCodigo.exec(RE.origemTitulo.exec(l)[1]);
        saida.push("Disciplina origem da Dispensa:" + (codigo ? " " + codigo[1] : ""));
        aguardandoOrigem = !codigo;
      } else if (aguardandoOrigem && RE.origemCodigo.test(l)) {
        saida.push(RE.origemCodigo.exec(l)[1]);
        aguardandoOrigem = false;
      } else if (/^\d{4}(?:\/\d)?(?:$|\s+Matr[íi]cula\b)/i.test(l)) {
        saida.push(RE.histPeriodo.exec(l)[1]);
      }
    }
    return saida;
  }

  // ---------------------------------------------------------------------------
  // Histórico
  // ---------------------------------------------------------------------------
  /**
   * Lê um Histórico do SIGA.
   * @returns {{registros: Array<{periodo, code, name, credits, ch, grau, sf, dispensaDe?}>}}
   *  - periodo: "2020/1", ou "2025" quando é bloco de créditos transferidos
   *  - grau "T" = disciplina dispensada; dispensaDe = código da disciplina de origem
   */
  function lerHistorico(texto) {
    const linhas = normalizarLinhas(texto);
    const registros = [];
    let periodo = null;
    let aguardandoOrigem = null; // registro "T" esperando a linha de origem
    for (const l of linhas) {
      const m = RE.histLinha.exec(l);
      if (m) {
        if (m[1]) periodo = m[1];
        const r = { periodo, code: m[2], name: m[3].trim(), credits: num(m[4]), ch: num(m[5]), grau: m[6], sf: m[9] };
        registros.push(r);
        aguardandoOrigem = r.grau === "T" ? r : null;
        continue;
      }
      const o = RE.origemTitulo.exec(l);
      if (o) {
        const c = RE.origemCodigo.exec(o[1] || "");
        if (c && aguardandoOrigem) { aguardandoOrigem.dispensaDe = c[1]; aguardandoOrigem = null; }
        continue;
      }
      if (aguardandoOrigem && !aguardandoOrigem.dispensaDe) {
        const c = RE.origemCodigo.exec(l);
        if (c) { aguardandoOrigem.dispensaDe = c[1]; aguardandoOrigem = null; continue; }
      }
      const p = RE.histPeriodo.exec(l);
      if (p) periodo = p[1];
    }
    return { registros };
  }

  // ---------------------------------------------------------------------------
  // BOA — Boletim de Orientação Acadêmica
  // ---------------------------------------------------------------------------
  /**
   * Lê o BOA do SIGA.
   * @returns {{emissao, cursando: Array<{code,name,credits,ch,ncc}>, equivalencias: Array<{recomendada, cursada}>,
   *            naoExplicitadas: Array<{code,name,credits,ch,grau}>, naoExplicitadasPresente: boolean,
   *            reprovacoes: Array<{code,name,periodos}>}}
   *  naoExplicitadasPresente distingue a seção "Cursadas e Não Explicitadas" presente (mesmo vazia) da ausente (PC-04).
   */
  function lerBOA(texto) {
    const linhas = normalizarLinhas(texto);
    const out = { emissao: null, cursando: [], equivalencias: [], naoExplicitadas: [], naoExplicitadasPresente: false, reprovacoes: [] };
    let secao = null;
    for (const l of linhas) {
      if (!out.emissao) { const e = RE.boaEmissao.exec(l); if (e) out.emissao = e[1]; }
      if (secaoNE.test(l)) { secao = "ne"; out.naoExplicitadasPresente = true; continue; }
      if (secaoElenco.test(l)) { secao = "elenco"; continue; }
      if (secaoReprov.test(l)) { secao = "reprov"; continue; }
      if (totalNE.test(l) && secao === "ne") { secao = null; continue; }

      if (secao === "ne") {
        const m = RE.boaNaoExplicitada.exec(l);
        if (m) out.naoExplicitadas.push({ code: m[1], name: m[2].trim(), credits: num(m[3]), ch: num(m[4]), grau: m[5] });
        continue;
      }
      // reprovações podem aparecer em qualquer ponto após o título (layout de colunas)
      const r = RE.boaReprovacao.exec(l);
      if (r) {
        const periodos = (r[4].match(/\d{4}\/\d/g) || []);
        out.reprovacoes.push({ code: r[1], name: r[2].trim(), periodos });
        continue;
      }
      if (secao === "elenco") {
        const m = RE.boaElenco.exec(l);
        if (!m) continue;
        const resto = m[6].trim();
        if (/^Cursando\b/i.test(resto)) {
          const ncc = m[3] === "NCC";
          out.cursando.push({ code: m[1], name: m[2].trim(), credits: ncc ? 0 : num(m[3]), ch: num(m[4]), ncc });
        } else {
          const c = RE.origemCodigo.exec(resto);
          if (c && c[1] !== m[1]) out.equivalencias.push({ recomendada: m[1], cursada: c[1] });
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Montagem do perfil
  // ---------------------------------------------------------------------------
  const chavePeriodo = (p) => {
    const m = /^(\d{4})(?:\/(\d))?/.exec(p || "");
    return m ? (+m[1]) * 10 + (m[2] != null ? +m[2] : 0) : 0;
  };
  /** Semestre seguinte: "2026/1" -> "2026/2"; "2026/2" -> "2027/1". */
  function proximoPeriodo(p) {
    const m = /^(\d{4})\/(\d)$/.exec(p || "");
    if (!m) return null;
    return +m[2] >= 2 ? `${+m[1] + 1}/1` : `${m[1]}/2`;
  }

  // ---------------------------------------------------------------------------
  // Papel dos históricos (PC-05): qual deles é o do curso atual
  // ---------------------------------------------------------------------------
  // Semestre real = AAAA/1 ou AAAA/2. "AAAA" sozinho (bloco de transferidos) e o marcador
  // "AAAA/0" só informam o ano.
  const semestreReal = (p) => /\/[12]$/.test(p || "");
  const anoDe = (p) => { const m = /^(\d{4})/.exec(p || ""); return m ? +m[1] : null; };

  /** Data mais recente de um histórico: {ano, sem}, com sem = null quando só o ano é conhecido. */
  function ultimaData(h) {
    let melhor = null;
    ((h && h.registros) || []).forEach((r) => {
      const ano = anoDe(r.periodo);
      if (ano == null) return;
      const sem = semestreReal(r.periodo) ? +r.periodo.slice(5) : null;
      if (!melhor || ano > melhor.ano || (ano === melhor.ano && sem != null && (melhor.sem == null || sem > melhor.sem))) melhor = { ano, sem };
    });
    return melhor;
  }
  /** 1 = a é posterior, -1 = b é posterior, 0 = empate ou datas que não permitem decidir. */
  function comparaData(a, b) {
    if (a.ano !== b.ano) return a.ano > b.ano ? 1 : -1;
    if (a.sem != null && b.sem != null && a.sem !== b.sem) return a.sem > b.sem ? 1 : -1;
    return 0;
  }
  /**
   * Papel de cada histórico. `escolhido` é o índice que a pessoa indicou (vence a regra automática).
   * @returns {{indice: number|null, estado: "unico"|"automatico"|"duvida"|"escolhido"}}
   *   indice = histórico do curso atual (null em dúvida ou sem registros datados)
   */
  function papelHistoricos(historicos, escolhido) {
    const com = (historicos || []).map((h, i) => ({ i, d: ultimaData(h), n: ((h && h.registros) || []).length })).filter((x) => x.n > 0);
    const datados = com.filter((x) => x.d);
    // A escolha explícita vale mesmo que um dos históricos reconhecidos não traga datas.
    if (escolhido != null && com.length >= 2 && com.some((x) => x.i === escolhido)) return { indice: escolhido, estado: "escolhido" };
    if (datados.length < 2) return { indice: datados.length ? datados[0].i : null, estado: "unico" };
    const melhor = datados.reduce((a, x) => (comparaData(x.d, a.d) > 0 ? x : a));
    const certo = datados.every((x) => x === melhor || comparaData(melhor.d, x.d) > 0);
    return certo ? { indice: melhor.i, estado: "automatico" } : { indice: null, estado: "duvida" };
  }
  /** Resumo para a prévia: último semestre real, maior ano de bloco e número de registros. */
  function resumoHistorico(h) {
    const regs = (h && h.registros) || [];
    const reais = regs.filter((r) => semestreReal(r.periodo)).map((r) => r.periodo).sort((x, y) => chavePeriodo(x) - chavePeriodo(y));
    const blocos = regs.filter((r) => r.periodo && !semestreReal(r.periodo)).map((r) => anoDe(r.periodo));
    return { semestre: reais.length ? reais[reais.length - 1] : null, bloco: blocos.length ? Math.max(...blocos) : null, registros: regs.length };
  }

  /**
   * Monta o perfil a partir dos documentos lidos.
   * @param {object} a
   * @param {Array} a.historicos  saídas de lerHistorico (um ou mais: ex. curso anterior + atual)
   * @param {object} [a.boa]      saída de lerBOA
   * @param {object} a.curriculo  { [code]: {category} } — disciplinas da grade (js/database.js)
   * @param {object} a.catalogo   { [code]: {category} } — optativas (js/optativas.js)
   * @param {object} [a.anterior] perfil anterior: preserva planejamento, pedidos, extensão, tags e textos
   * @param {number} [a.atualIdx] índice, em a.historicos, do histórico do curso atual (escolha explícita; vence a regra automática)
   * @param {string} [a.hoje]     data ISO usada em "fonte.geradoEm" (permite saída determinística em testes)
   */
  function montarPerfil(a) {
    const curriculo = a.curriculo || {}, catalogo = a.catalogo || {};
    const anterior = a.anterior || null;
    const conhecido = (c) => curriculo[c] || catalogo[c];
    const ace = (c) => conhecido(c)?.category === 5;

    // 1) Junta registros de todos os históricos. Um mesmo (código, situação, grau) que aparece num
    //    bloco de "créditos transferidos" (período só com ano, ou AAAA/0) e também num semestre real
    //    fica só no semestre real, com uma exceção (D-03): o bloco do histórico do curso atual vale
    //    para o prazo de 5 anos e o semestre real do outro histórico vira só informação (`aprovadaEm`).
    const papel = papelHistoricos(a.historicos || [], a.atualIdx);
    const todos = [];
    (a.historicos || []).forEach((h, i) => (h.registros || []).forEach((r) => todos.push(Object.assign({}, r, { _h: i }))));
    const chaveReg = (r) => r.code + "|" + r.sf + "|" + r.grau;
    const doAtual = (r) => papel.indice != null && r._h === papel.indice;
    const reaisAtual = new Set(todos.filter((r) => semestreReal(r.periodo) && doAtual(r)).map(chaveReg));
    const reaisOutros = new Map(); // chave -> semestre real mais antigo, em históricos que não são o atual
    todos.filter((r) => semestreReal(r.periodo) && !doAtual(r)).forEach((r) => {
      const k = chaveReg(r);
      if (!reaisOutros.has(k) || chavePeriodo(r.periodo) < chavePeriodo(reaisOutros.get(k))) reaisOutros.set(k, r.periodo);
    });
    // Entre blocos de transferidos do mesmo (código, situação, grau) vale um só, escolhido pelos dados e não pela
    // ordem dos arquivos: o do histórico atual; senão, o mais antigo (o mais prudente para o prazo de 5 anos).
    const blocoVale = new Map();
    todos.filter((r) => !semestreReal(r.periodo)).forEach((r) => {
      const k = chaveReg(r), v = blocoVale.get(k);
      if (!v || (doAtual(r) && !doAtual(v)) || (doAtual(r) === doAtual(v) && chavePeriodo(r.periodo) < chavePeriodo(v.periodo))) blocoVale.set(k, r);
    });
    // O bloco do histórico atual absorve só a ocorrência real mais antiga do outro histórico (vira `aprovadaEm`);
    // as demais ocorrências reais continuam, pois são aprovações distintas (ex.: ACE em 2020/1 e 2021/1).
    const absorvida = new Map();
    blocoVale.forEach((b, k) => { if (doAtual(b) && !reaisAtual.has(k) && reaisOutros.has(k)) absorvida.set(k, reaisOutros.get(k)); });
    const vistos = new Set();
    const regs = todos.filter((r) => {
      const real = semestreReal(r.periodo), k0 = chaveReg(r);
      if (!real && (reaisAtual.has(k0) || blocoVale.get(k0) !== r)) return false;
      if (!real && reaisOutros.has(k0) && !absorvida.has(k0)) return false;
      if (real && !doAtual(r) && absorvida.get(k0) === r.periodo) return false;
      if (!real && absorvida.has(k0)) r.aprovadaEm = absorvida.get(k0);
      const k = (real ? r.periodo : "T") + "|" + k0;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });

    // 2) A dispensa acompanha a origem aprovada quando ela está nos documentos.
    const origensAprovadas = new Set(regs.filter((r) => r.grau !== "T" && r.sf === "AP").map((r) => r.code));
    const dispensas = {}; // origem -> [alvos]; alvo fora do currículo e do catálogo leva nome e créditos (D-07)
    regs.filter((r) => r.grau === "T" && r.sf === "AP" && origensAprovadas.has(r.dispensaDe)).forEach((r) => {
      const lista = (dispensas[r.dispensaDe] = dispensas[r.dispensaDe] || []);
      if (!lista.some((x) => (x.code || x) === r.code)) lista.push(conhecido(r.code) ? r.code : { code: r.code, name: r.name, credits: r.credits, category: 3 });
    });

    // 3) Equivalências do BOA (recomendada ← cursada): ex. COS231 ← EEL470
    const equivale = {};
    ((a.boa && a.boa.equivalencias) || []).forEach((e) => { if (!equivale[e.cursada] && e.cursada !== e.recomendada) equivale[e.cursada] = e.recomendada; });

    // 4) Monta os períodos cursados
    const periodos = {};
    const add = (nome, item) => (periodos[nome] = periodos[nome] || []).push(item);
    regs.forEach((r) => {
      if (r.grau === "T" && r.sf === "AP" && origensAprovadas.has(r.dispensaDe)) return;
      const nome = /\//.test(r.periodo || "") ? r.periodo : `${r.periodo || "?"} (transferidas)`;
      const item = { code: r.code };
      if (!conhecido(r.code)) Object.assign(item, { name: r.name, credits: r.credits, category: 3 });
      if (r.grau === "T") item.nota = "T";
      else {
        if (equivale[r.code]) item.equivale = equivale[r.code];
        if (dispensas[r.code] && r.sf === "AP") item.dispensa = dispensas[r.code].slice();
      }
      if (r.sf !== "AP") item.status = "reprovado";
      if (/^\d+(\.\d+)?$/.test(r.grau)) item.nota = num(r.grau);
      if (r.aprovadaEm) item.aprovadaEm = r.aprovadaEm;
      add(nome, item);
    });
    // 5) Reprovações listadas no BOA (o histórico só mostra aprovações)
    ((a.boa && a.boa.reprovacoes) || []).forEach((rp) => rp.periodos.forEach((p) => {
      if (/\/0$/.test(p)) return; // "2025/0" = período de transferência, sem semestre real
      const lista = periodos[p] || [];
      if (!lista.some((i) => i.code === rp.code && i.status === "reprovado")) {
        const item = { code: rp.code, status: "reprovado" };
        if (!conhecido(rp.code)) Object.assign(item, { name: rp.name, category: 3 });
        add(p, item);
      }
    }));

    const nomes = Object.keys(periodos).sort((x, y) => chavePeriodo(x) - chavePeriodo(y) || x.localeCompare(y));
    const saida = nomes.map((nome) => ({ nome, disciplinas: periodos[nome] }));

    // 6) Período atual = disciplinas "Cursando" no BOA (ACE vai para a lista de extensão)
    const ultimo = nomes.filter((n) => /^\d{4}\/[12]$/.test(n)).pop();
    const atualNome = proximoPeriodo(ultimo) || "atual";
    const cursando = (a.boa && a.boa.cursando) || [];
    const extensaoBOA = [];
    const atualItens = [];
    cursando.forEach((c) => {
      if (ace(c.code)) { extensaoBOA.push({ nome: c.name, code: c.code, horas: c.ch, periodo: atualNome, status: "em andamento" }); return; }
      const item = { code: c.code };
      if (!conhecido(c.code)) Object.assign(item, { name: c.name, credits: c.credits, category: 3 });
      atualItens.push(item);
    });
    if (atualItens.length) saida.push({ nome: atualNome, atual: true, disciplinas: atualItens });

    // 7) Mescla com o perfil anterior (o que o SIGA não tem: planos, pedidos, tags, horários)
    const perfil = {
      titulo: (anterior && anterior.titulo) || "Grade ECI",
      subtitulo: (anterior && anterior.subtitulo) || "Engenharia de Computação e Informação · UFRJ",
      curso: (anterior && anterior.curso != null) ? anterior.curso : 1,
      fonte: { geradoPor: `siga.js ${VERSAO}`, geradoEm: a.hoje || new Date().toISOString().slice(0, 10), boaEmissao: (a.boa && a.boa.emissao) || null },
    };
    // "duvida" nunca é gravada: quem importa escolhe o histórico do curso atual antes (PC-05).
    if (papel.estado === "automatico" || papel.estado === "escolhido") perfil.fonte.historicoAtual = papel.estado;
    if (anterior && anterior.nome) perfil.nome = anterior.nome;
    if (a.boa) perfil.boa = { emissao: a.boa.emissao, naoExplicitadas: a.boa.naoExplicitadas, naoExplicitadasPresente: !!a.boa.naoExplicitadasPresente };
    perfil.equivalencias = (anterior && anterior.equivalencias) || [];
    // extensão: mantém a lista anterior e acrescenta atividades do BOA ainda não registradas
    const ext = ((anterior && anterior.extensao) || []).slice();
    extensaoBOA.forEach((e) => { if (!ext.some((x) => x.code && x.code === e.code)) ext.push(e); });
    perfil.extensao = ext;
    ["tags", "marcacoes"].forEach((k) => { if (anterior && anterior[k] != null) perfil[k] = anterior[k]; });

    if (anterior && Array.isArray(anterior.periodos)) {
      // horários e status já anotados no período atual anterior são preservados
      const antAtual = anterior.periodos.find((p) => p.atual);
      let atual = saida.find((p) => p.atual);
      if (!a.boa && antAtual && /^\d{4}\/[12]$/.test(antAtual.nome)
        && chavePeriodo(antAtual.nome) > chavePeriodo(ultimo)) {
        atual = antAtual;
        saida.push(atual);
      } else if (antAtual && atual && antAtual.nome === atual.nome) {
        atual.disciplinas.forEach((it) => {
          const v = (antAtual.disciplinas || []).map((d) => (typeof d === "string" ? { code: d } : d)).find((d) => d.code === it.code);
          if (v) {
            if (v.horarios != null) it.horarios = v.horarios;
            if (v.status) it.status = v.status;
          }
        });
      }
      // períodos planejados posteriores ao atual continuam valendo
      const corte = chavePeriodo(atual ? atual.nome : ultimo);
      anterior.periodos.filter((p) => p.planejado && (!chavePeriodo(p.nome) || chavePeriodo(p.nome) > corte)
        && !saida.some((s) => s.nome === p.nome)).forEach((p) => saida.push(p));
    }
    perfil.periodos = saida;
    return perfil;
  }

  return { VERSAO, RE, normalizarLinhas, filtrarPaginaPDF, extrairLinhasPDF, lerHistorico, lerBOA, montarPerfil, proximoPeriodo, papelHistoricos, resumoHistorico };
});
