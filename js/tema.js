/*
 * Tema claro/escuro. Carregado de forma síncrona no <head> (a CSP não permite script inline),
 * antes da primeira pintura, para não piscar o tema errado.
 *
 *   Sem escolha salva   segue o sistema (prefers-color-scheme) e <meta name="color-scheme" content="light dark">.
 *   Com escolha salva   "claro" ou "escuro" em localStorage (gradeECI.v2.tema): vale para a página e para os
 *                       controles nativos (color-scheme), mesmo que o sistema mude depois.
 *
 * Aparência (Configurações): "icone-texto" (padrão, sem chave), "icone" (Só ícones) ou "minimalista", em
 * gradeECI.v2.aparencia. Vale para a barra do topo, o seletor de modo, as abas e os controles com ícone. É lida,
 * migrada e aplicada aqui (data-aparencia no <html>), antes da primeira pintura, para não piscar.
 *
 * Migração das chaves antigas (uma vez, ao carregar):
 *   seletorIcones true          → "icone"; false → "icone-texto"
 *   aparencia "icone"           → continua "icone" (mesmo com seletorIcones false)
 *   aparencia "texto"           → "icone-texto" (o nível "Somente texto" deixou de existir; o texto continua visível)
 * A chave seletorIcones só é removida depois que a nova preferência foi gravada.
 *
 * O botão sol/lua do cabeçalho chama window.TEMA.alterna(); Configurações usa define() e defineAparencia().
 */
(function () {
  "use strict";
  var CHAVE = "gradeECI.v2.tema";
  var raiz = document.documentElement;
  var midia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var ouvintes = [];
  var naMemoria = null; // escolha desta visita quando o navegador não deixa salvar
  var CHAVE_AP = "gradeECI.v2.aparencia";
  var CHAVE_SELETOR = "gradeECI.v2.seletorIcones";   // chave antiga: "Mostrar só ícones no seletor"
  var NIVEIS = ["icone-texto", "icone", "minimalista"];
  var aparenciaMemoria = null;

  function salvo() {
    try {
      var v = JSON.parse(localStorage.getItem(CHAVE));
      if (v === "claro" || v === "escuro") return v;
    } catch (e) { /* armazenamento indisponível */ }
    return naMemoria;
  }
  function sistema() { return midia && midia.matches ? "escuro" : "claro"; }
  function atual() { return salvo() || sistema(); }

  function aplica() {
    var escolha = salvo();
    if (escolha) raiz.setAttribute("data-tema", escolha); else raiz.removeAttribute("data-tema");
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", escolha === "claro" ? "light" : escolha === "escuro" ? "dark" : "light dark");
    ouvintes.forEach(function (f) { f(atual()); });
  }

  /** Troca para o oposto do tema que está na tela e lembra a escolha neste navegador. */
  function alterna() {
    var novo = atual() === "escuro" ? "claro" : "escuro";
    naMemoria = novo;
    try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch (e) { /* vale só nesta visita */ }
    aplica();
  }

  /** Escolha explícita: "claro", "escuro" ou null (seguir o sistema). */
  function define(v) {
    naMemoria = v === "claro" || v === "escuro" ? v : null;
    try { if (naMemoria) localStorage.setItem(CHAVE, JSON.stringify(naMemoria)); else localStorage.removeItem(CHAVE); } catch (e) { /* só nesta visita */ }
    aplica();
  }

  function lerJSON(k) {
    try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; }
  }
  function aparencia() {
    var v = lerJSON(CHAVE_AP);
    if (v === "icone" || v === "minimalista") return v;
    return aparenciaMemoria || "icone-texto";
  }
  function aplicaAparencia() { raiz.setAttribute("data-aparencia", aparencia()); }
  /** Grava o nível ("icone-texto" é o padrão: sem chave). Devolve false se o navegador não deixou salvar. */
  function gravaAparencia(v) {
    aparenciaMemoria = NIVEIS.indexOf(v) >= 0 ? v : "icone-texto";
    try {
      if (aparenciaMemoria !== "icone-texto") localStorage.setItem(CHAVE_AP, JSON.stringify(aparenciaMemoria));
      else localStorage.removeItem(CHAVE_AP);
      return true;
    } catch (e) { return false; /* só nesta visita */ }
  }
  function defineAparencia(v) { gravaAparencia(v); aplicaAparencia(); }
  /** Converte as preferências antigas (seletor só com ícones e "Somente texto") no nível novo. */
  function migraAparencia() {
    var ap = lerJSON(CHAVE_AP), seletor = lerJSON(CHAVE_SELETOR);
    var temSeletor = false;
    try { temSeletor = localStorage.getItem(CHAVE_SELETOR) !== null; } catch (e) { return; }
    if (ap === "icone" || ap === "minimalista") {
      if (temSeletor) try { localStorage.removeItem(CHAVE_SELETOR); } catch (e) { /* fica para a próxima visita */ }
      return;
    }
    if (!temSeletor && ap == null) return;
    if (gravaAparencia(seletor === true ? "icone" : "icone-texto") && temSeletor) {
      try { localStorage.removeItem(CHAVE_SELETOR); } catch (e) { /* fica para a próxima visita */ }
    }
  }

  aplica();
  migraAparencia();
  aplicaAparencia();
  if (midia) {
    var mudou = function () { if (!salvo()) aplica(); };
    if (midia.addEventListener) midia.addEventListener("change", mudou); else if (midia.addListener) midia.addListener(mudou);
  }
  // Outra aba mudou o tema (ou apagou os dados): acompanha.
  window.addEventListener("storage", function (ev) {
    if (ev.key === CHAVE || ev.key === null) { naMemoria = null; aplica(); }
    if (ev.key === CHAVE_AP || ev.key === null) { aparenciaMemoria = null; aplicaAparencia(); }
  });

  window.TEMA = {
    atual: atual, escolha: salvo, alterna: alterna, define: define, aoMudar: function (f) { ouvintes.push(f); },
    aparencia: aparencia, defineAparencia: defineAparencia,
  };
})();
