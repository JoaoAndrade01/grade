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
   * @returns {{emissao, cursando: Array<{code,name,credits,ch}>, equivalencias: Array<{recomendada, cursada}>,
   *            naoExplicitadas: Array<{code,name,credits,ch,grau}>, reprovacoes: Array<{code,name,periodos}>}}
   */
  function lerBOA(texto) {
    const linhas = normalizarLinhas(texto);
    const out = { emissao: null, cursando: [], equivalencias: [], naoExplicitadas: [], reprovacoes: [] };
    let secao = null;
    for (const l of linhas) {
      if (!out.emissao) { const e = RE.boaEmissao.exec(l); if (e) out.emissao = e[1]; }
      if (/Cursadas e N[ãa]o Explicitadas/i.test(l)) { secao = "ne"; continue; }
      if (/Atividades Acad[êe]micas (Obrigat[óo]rias|Optativas)/i.test(l)) { secao = "elenco"; continue; }
      if (/Frequ[êe]ncia de reprova/i.test(l)) { secao = "reprov"; continue; }
      if (/^Total(:| de Livre)/i.test(l) && secao === "ne") { secao = null; continue; }

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
          out.cursando.push({ code: m[1], name: m[2].trim(), credits: m[3] === "NCC" ? 0 : num(m[3]), ch: num(m[4]) });
        } else {
          const c = /^([A-Z]{3}[A-Z0-9]{3})\s/.exec(resto);
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

  /**
   * Monta o perfil a partir dos documentos lidos.
   * @param {object} a
   * @param {Array} a.historicos  saídas de lerHistorico (um ou mais: ex. curso anterior + atual)
   * @param {object} [a.boa]      saída de lerBOA
   * @param {object} a.curriculo  { [code]: {category} } — disciplinas da grade (js/database.js)
   * @param {object} a.catalogo   { [code]: {category} } — optativas (js/optativas.js)
   * @param {object} [a.anterior] perfil anterior: preserva planejamento, pedidos, extensão, tags e textos
   * @param {string} [a.hoje]     data ISO usada em "fonte.geradoEm" (permite saída determinística em testes)
   */
  function montarPerfil(a) {
    const curriculo = a.curriculo || {}, catalogo = a.catalogo || {};
    const anterior = a.anterior || null;
    const conhecido = (c) => curriculo[c] || catalogo[c];
    const ace = (c) => (catalogo[c] && catalogo[c].category == 5) || /^EEW[XYZUKE]/.test(c);

    // 1) Junta registros de todos os históricos. Um mesmo (código, situação) que aparece num
    //    bloco de "créditos transferidos" (período só com ano) e também num semestre real
    //    fica só no semestre real.
    const todos = [];
    (a.historicos || []).forEach((h) => (h.registros || []).forEach((r) => todos.push(Object.assign({}, r))));
    const emSemestre = new Set(todos.filter((r) => /\//.test(r.periodo || "")).map((r) => r.code + "|" + r.sf + "|" + r.grau));
    const vistos = new Set();
    const regs = todos.filter((r) => {
      const real = /\//.test(r.periodo || "");
      if (!real && emSemestre.has(r.code + "|" + r.sf + "|" + r.grau)) return false;
      const k = (real ? r.periodo : "T") + "|" + r.code + "|" + r.sf + "|" + r.grau;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });

    // 2) Dispensas (grau "T"): viram "dispensa" na disciplina de origem, não um item próprio.
    const dispensas = {}; // origem -> [alvos]
    regs.filter((r) => r.grau === "T" && r.dispensaDe).forEach((r) => (dispensas[r.dispensaDe] = dispensas[r.dispensaDe] || []).push(r.code));

    // 3) Equivalências do BOA (recomendada ← cursada): ex. COS231 ← EEL470
    const equivale = {};
    ((a.boa && a.boa.equivalencias) || []).forEach((e) => { if (!equivale[e.cursada] && e.cursada !== e.recomendada) equivale[e.cursada] = e.recomendada; });

    // 4) Monta os períodos cursados
    const periodos = {};
    const add = (nome, item) => (periodos[nome] = periodos[nome] || []).push(item);
    regs.forEach((r) => {
      if (r.grau === "T") return;
      const nome = /\//.test(r.periodo || "") ? r.periodo : `${r.periodo || "?"} (transferidas)`;
      const item = { code: r.code };
      if (!conhecido(r.code)) Object.assign(item, { name: r.name, credits: r.credits, category: 3 });
      if (equivale[r.code]) item.equivale = equivale[r.code];
      if (dispensas[r.code]) item.dispensa = dispensas[r.code].slice();
      if (r.sf !== "AP") item.status = "reprovado";
      if (/^\d+(\.\d+)?$/.test(r.grau)) item.nota = num(r.grau);
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
    const ultimo = nomes.filter((n) => /^\d{4}\/\d$/.test(n)).pop();
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
    if (anterior && anterior.nome) perfil.nome = anterior.nome;
    if (a.boa) perfil.boa = { emissao: a.boa.emissao, naoExplicitadas: a.boa.naoExplicitadas };
    perfil.equivalencias = (anterior && anterior.equivalencias) || [];
    // extensão: mantém a lista anterior e acrescenta atividades do BOA ainda não registradas
    const ext = ((anterior && anterior.extensao) || []).slice();
    extensaoBOA.forEach((e) => { if (!ext.some((x) => x.code && x.code === e.code)) ext.push(e); });
    perfil.extensao = ext;
    ["tags", "marcacoes"].forEach((k) => { if (anterior && anterior[k]) perfil[k] = anterior[k]; });

    if (anterior && Array.isArray(anterior.periodos)) {
      // horários e status já anotados no período atual anterior são preservados
      const antAtual = anterior.periodos.find((p) => p.atual);
      const atual = saida.find((p) => p.atual);
      if (antAtual && atual && antAtual.nome === atual.nome) {
        atual.disciplinas.forEach((it) => {
          const v = (antAtual.disciplinas || []).map((d) => (typeof d === "string" ? { code: d } : d)).find((d) => d.code === it.code);
          if (v) { if (v.horarios) it.horarios = v.horarios; if (v.status) it.status = v.status; }
        });
      }
      // períodos planejados posteriores ao atual continuam valendo
      const corte = chavePeriodo(atual ? atual.nome : ultimo);
      anterior.periodos.filter((p) => p.planejado && chavePeriodo(p.nome) > corte).forEach((p) => saida.push(p));
    }
    perfil.periodos = saida;
    return perfil;
  }

  return { VERSAO, RE, normalizarLinhas, lerHistorico, lerBOA, montarPerfil, proximoPeriodo };
});
