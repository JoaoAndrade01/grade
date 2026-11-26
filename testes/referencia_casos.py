"""Casos 17a a 17f do RF-17 (validador dos dados de referência).

Sem argumentos: roda os casos sintéticos (17a a 17e), que usam só dados fictícios, e o
validador nos dados reais de referência do repositório.
Com --browser e --out: roda também o 17f no navegador, sobre uma cópia pública do
commit indicado em --ref, com uma fixture local de guia.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import referencia as ref

TESTES = Path(__file__).resolve().parent
OCORRENCIAS = []        # (ok, nome, detalhe)


# ---------------------------------------------------------------- dados fictícios
CURRICULO = '''window.courses = [
  [],
  [
    { name: "Disciplina Ficticia A", credits: 4, code: "AAA111", semester: 1, category: 1, workload: 60},
    { name: "Disciplina Ficticia B", credits: 4, code: "BBB222", semester: 2, category: 1, workload: 60},
  ]
]
'''
CATALOGO = '''window.optativas = window.optativas || {};
window.optativas[1] = [
    {"code": "OPT001", "name": "Optativa Ficticia", "credits": 4, "category": 2, "workload": 60},
];
'''
HORARIOS = '''window.horarios = window.horarios || {};
window.horarios[1] = {
  fonte: "Fonte ficticia",
  consultado: "2026-01-01",
  impar: {
    AAA111: ["seg 08-10", "qua 08-10"],
    OPT001: ["ter 10-12"],
  },
  par: {
    BBB222: ["qui 14-16"],
    AAA111: ["sex 08-10"],
  },
  semCodigo: {
    impar: [
      { name: "Turma Ficticia Um", horarios: ["ter 13-15"] },
      { name: "Turma Ficticia Dois", horarios: ["qui 13-15"] },
    ],
    par: [],
  },
};
'''
GUIA = '''window.guia = window.guia || {};
window.guia[1] = {
  fonte: "Fonte ficticia",
  consultado: "2026-01-01",
  niveis: {
    1: { emoji: "A", nome: "Um", texto: "Texto um." },
    2: { emoji: "B", nome: "Dois", texto: "Texto dois." },
    3: { emoji: "C", nome: "Tres", texto: "Texto tres." },
    4: { emoji: "D", nome: "Quatro", texto: "Texto quatro." },
    5: { emoji: "E", nome: "Cinco", texto: "Texto cinco." },
  },
  observacoes: ["Observacao ficticia."],
  disciplinas: {
    AAA111: { nivel: 3, presenca: "com", descricao: "Descricao ficticia." },
    OPT001: { nivel: 2 },
  },
  semCodigo: {
    "Turma Ficticia Um": { nivel: 3 },
  },
};
'''
BASE = {"horarios": HORARIOS, "guia": GUIA, "database": CURRICULO, "optativas": CATALOGO}


def excecao(**kw):
    e = {"arquivos": ["horarios"], "curso": 1, "origem": "fonte ficticia", "motivo": "motivo ficticio",
         "efeito": "somente-informativo"}
    e.update(kw)
    return e


EXC_BASE = {"excecoes": [excecao(nome="Turma Ficticia Um", arquivos=["horarios", "guia"]),
                         excecao(nome="Turma Ficticia Dois")]}


def roda(arquivo=None, de=None, para=None, excecoes=None, textos=None):
    """Aplica UMA troca de texto em um arquivo e valida."""
    t = dict(textos or BASE)
    if arquivo:
        assert t[arquivo].count(de) == 1, f"troca ambígua ou ausente em {arquivo}: {de!r}"
        t[arquivo] = t[arquivo].replace(de, para)
    return ref.valida_textos(t, excecoes if excecoes is not None else EXC_BASE)


def registra(nome, condicao, detalhe=""):
    OCORRENCIAS.append((bool(condicao), nome, "" if condicao else detalhe))


def falha_com(nome, resultado, *identificadores, so_essas=True):
    """O caso falha, e todo erro identifica a entrada (pelos identificadores dados)."""
    erros = resultado["erros"]
    ok = bool(erros) and any(all(i in e for i in identificadores) for e in erros)
    if so_essas:
        ok = ok and all(any(i in e for i in identificadores) for e in erros)
    registra(nome, ok, "erros: " + (" | ".join(erros) or "(nenhum)"))


# ---------------------------------------------------------------- 17a a 17e
def casos_sinteticos():
    # 17a
    r = roda()
    registra("17a Horário e guia válidos passam (A=B: mesmo código em paridades diferentes não é duplicata)",
             not r["erros"], " | ".join(r["erros"]))

    # 17b: em cada arquivo, por vez, um código fora do currículo, do catálogo e das exceções
    r = roda("horarios", 'OPT001: ["ter 10-12"]', 'ZZZ999: ["ter 10-12"]')
    falha_com("17b Código desconhecido em horarios.js falha e identifica o código", r, "ZZZ999", "horarios")
    r = roda("guia", "OPT001: { nivel: 2 }", "ZZZ999: { nivel: 2 }")
    falha_com("17b Código desconhecido em guia.js falha e identifica o código", r, "ZZZ999", "guia")
    r = roda("horarios", 'OPT001: ["ter 10-12"]', 'ZZZ999: ["ter 10-12"]',
             excecoes={"excecoes": EXC_BASE["excecoes"] + [excecao(codigo="ZZZ999", arquivos=["guia"])]})
    falha_com("17b Exceção de guia não libera o mesmo código em horarios", r, "ZZZ999", "horarios")
    r = roda("horarios", 'AAA111: ["seg 08-10", "qua 08-10"]', 'aaa111: ["seg 08-10", "qua 08-10"]')
    falha_com("17b Código com formato inválido falha e identifica o código", r, "aaa111")

    # 17c: o mesmo código como exceção
    e = excecao(codigo="ZZZ999", origem="origem ficticia X", motivo="motivo ficticio Y")
    r = roda("horarios", 'OPT001: ["ter 10-12"]', 'ZZZ999: ["ter 10-12"]',
             excecoes={"excecoes": EXC_BASE["excecoes"] + [e]})
    usada = [x for x in r["excecoes_usadas"] if x.get("codigo") == "ZZZ999"]
    registra("17c Com exceção (origem, motivo, efeito) a entrada passa e a exceção é reportada",
             not r["erros"] and len(usada) == 1 and usada[0]["origem"] == "origem ficticia X"
             and usada[0]["motivo"] == "motivo ficticio Y" and usada[0]["efeito"] == "somente-informativo",
             " | ".join(r["erros"]) or str(r["excecoes_usadas"]))
    saida = __import__("io").StringIO()
    ref.imprime(r, saida)
    texto = saida.getvalue()
    registra("17c O relatório impresso traz código, efeito, motivo e origem da exceção",
             all(s in texto for s in ("ZZZ999", "somente-informativo", "motivo ficticio Y", "origem ficticia X")), texto)
    for campo in ("origem", "motivo", "efeito"):
        incompleta = {k: v for k, v in e.items() if k != campo}
        r = roda("horarios", 'OPT001: ["ter 10-12"]', 'ZZZ999: ["ter 10-12"]',
                 excecoes={"excecoes": EXC_BASE["excecoes"] + [incompleta]})
        falha_com(f"17c Exceção sem '{campo}' falha e identifica a exceção", r, "ZZZ999", so_essas=False)
    r = roda("horarios", 'OPT001: ["ter 10-12"]', 'ZZZ999: ["ter 10-12"]',
             excecoes={"excecoes": EXC_BASE["excecoes"] + [excecao(codigo="ZZZ999", efeito="entra-no-calculo")]})
    falha_com("17c Exceção 'entra-no-calculo' em código desconhecido falha (nunca entraria no cálculo)", r, "ZZZ999", so_essas=False)
    r = roda(excecoes={"excecoes": EXC_BASE["excecoes"] + [excecao(codigo="ZZZ999")]})
    registra("17c Exceção sem entrada correspondente passa, mas aparece como 'sem uso'",
             not r["erros"] and any(x.get("codigo") == "ZZZ999" for x in r["excecoes_sem_uso"]), str(r["erros"]))

    # M6: validar antes de indexar, diagnóstico de uso por arquivo e efeito coerente com a identidade
    for rotulo, muda in (("'arquivos' nulo", {"arquivos": None}), ("'arquivos' como texto", {"arquivos": "horarios"}),
                         ("'nome' como lista", {"nome": ["x"]}), ("'codigo' numérico", {"codigo": 5}),
                         ("'curso' como texto", {"curso": "1"}), ("'origem' numérica", {"origem": 7})):
        try:
            r = roda(excecoes={"excecoes": EXC_BASE["excecoes"] + [excecao(**{"codigo": "ZZZ999", **muda})]})
            falha_com(f"M6 Exceção com {rotulo} vira erro identificado, sem exceção do Python", r, "exceção #3", so_essas=False)
        except Exception as ex:
            registra(f"M6 Exceção com {rotulo} vira erro identificado, sem exceção do Python", False, f"{type(ex).__name__}: {ex}")
    for rotulo, exc in (("lista no lugar do objeto", []), ("'excecoes' que não é lista", {"excecoes": {"a": 1}}),
                        ("item que não é objeto", {"excecoes": EXC_BASE["excecoes"] + [1, "x", None]})):
        try:
            r = roda(excecoes=exc)
            registra(f"M6 Arquivo de exceções com {rotulo} vira erro, sem exceção do Python", bool(r["erros"]), "nenhum erro")
        except Exception as ex:
            registra(f"M6 Arquivo de exceções com {rotulo} vira erro, sem exceção do Python", False, f"{type(ex).__name__}: {ex}")
    r = roda(excecoes={"excecoes": [EXC_BASE["excecoes"][0], excecao(nome="Turma Ficticia Dois", arquivos=["horarios", "guia"])]})
    sem = [(x.get("nome"), x.get("arquivo")) for x in r["excecoes_sem_uso"]]
    registra("M6 Exceção usada só em horarios e declarada também para guia: aviso por fonte, sem falha",
             not r["erros"] and sem == [("Turma Ficticia Dois", "guia")] and any("js/guia.js" in a for a in r.get("avisos", [])),
             f"{r['erros']} {sem} {r.get('avisos')}")
    usada = [x for x in r["excecoes_usadas"] if x.get("nome") == "Turma Ficticia Dois"]
    registra("M6 A exceção parcialmente usada informa onde foi usada", len(usada) == 1 and usada[0].get("usada_em") == ["horarios"], str(usada))
    r = roda(excecoes={"excecoes": EXC_BASE["excecoes"] + [excecao(codigo="ZZZ999", arquivos=["horarios", "guia"])]})
    registra("M6 Exceção que nenhuma fonte usa: um aviso por fonte (horarios e guia), sem falha",
             not r["erros"] and sorted(x.get("arquivo") for x in r["excecoes_sem_uso"]) == ["guia", "horarios"] and len(r.get("avisos", [])) == 2,
             f"{r['erros']} {r['excecoes_sem_uso']}")
    saida = __import__("io").StringIO()
    ref.imprime(r, saida)
    registra("M6 O relatório impresso nomeia a fonte sem uso", "ZZZ999: sem uso em js/guia.js" in saida.getvalue(), saida.getvalue())
    r = roda(excecoes={"excecoes": [excecao(nome="Turma Ficticia Um", arquivos=["horarios", "guia"], efeito="entra-no-calculo"), EXC_BASE["excecoes"][1]]})
    falha_com("M6 Efeito 'entra-no-calculo' para nome sem código falha e identifica a exceção", r, "Turma Ficticia Um", "entra-no-calculo", so_essas=False)

    # 17d: uma variante por execução, cada uma falha e identifica a entrada
    H, G = "horarios", "guia"
    variantes = [
        # campo obrigatório ausente
        ("campo ausente: 'consultado' de horarios", H, '  consultado: "2026-01-01",\n  impar', "  impar", ["consultado"]),
        ("campo ausente: 'fonte' de guia", G, '  fonte: "Fonte ficticia",\n  consultado', "  consultado", ["guia[1]", "fonte"]),
        ("campo ausente: 'horarios' da turma sem código", H, '{ name: "Turma Ficticia Dois", horarios: ["qui 13-15"] }',
         '{ name: "Turma Ficticia Dois" }', ["Turma Ficticia Dois", "horarios"]),
        ("campo ausente: 'name' da turma sem código", H, '{ name: "Turma Ficticia Dois", horarios: ["qui 13-15"] }',
         '{ horarios: ["qui 13-15"] }', ["semCodigo.impar[1]", "name"]),
        ("campo ausente: 'nivel' da disciplina do guia", G, 'AAA111: { nivel: 3, presenca: "com", descricao: "Descricao ficticia." }',
         'AAA111: { presenca: "com" }', ["AAA111", "nivel"]),
        # tipo inválido
        ("tipo inválido: horários como texto", H, 'OPT001: ["ter 10-12"]', 'OPT001: "ter 10-12"', ["OPT001", "lista"]),
        ("tipo inválido: lista de horários vazia", H, 'OPT001: ["ter 10-12"]', "OPT001: []", ["OPT001", "lista"]),
        ("tipo inválido: horário numérico", H, 'OPT001: ["ter 10-12"]', "OPT001: [1012]", ["OPT001", "1012"]),
        ("tipo inválido: nível como texto", G, "OPT001: { nivel: 2 }", 'OPT001: { nivel: "2" }', ["OPT001", "nivel"]),
        ("tipo inválido: nível fora de 1 a 5", G, "OPT001: { nivel: 2 }", "OPT001: { nivel: 9 }", ["OPT001", "nivel"]),
        ("tipo inválido: presença desconhecida", G, 'presenca: "com"', 'presenca: "talvez"', ["AAA111", "presenca"]),
        ("tipo inválido: descrição numérica", G, 'descricao: "Descricao ficticia."', "descricao: 7", ["AAA111", "descricao"]),
        ("tipo inválido: 'consultado' fora de AAAA-MM-DD", H, '"2026-01-01",\n  impar', '"01/01/2026",\n  impar', ["consultado"]),
        ("tipo inválido: campo desconhecido na turma sem código", H, '{ name: "Turma Ficticia Dois", horarios: ["qui 13-15"] }',
         '{ name: "Turma Ficticia Dois", horario: ["qui 13-15"] }', ["Turma Ficticia Dois", "horario"]),
        # horário malformado
        ("horário malformado: 'ter 10h-12h'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10h-12h"]', ["OPT001", "10h-12h"]),
        ("horário malformado: dia fora de seg a sex", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["sab 10-12"]', ["OPT001", "sab 10-12"]),
        ("horário malformado: sem hora final", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10"]', ["OPT001", "ter 10"]),
        ("horário malformado: hora 25", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-25"]', ["OPT001", "ter 10-25"]),
        ("horário malformado na turma sem código", H, '["ter 13-15"]', '["ter 13-"]', ["Turma Ficticia Um", "ter 13-"]),
        ("início igual ao fim", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-10"]', ["OPT001", "ter 10-10"]),
        ("início posterior ao fim", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 12-10"]', ["OPT001", "ter 12-10"]),
        ("início posterior ao fim na turma sem código", H, '["qui 13-15"]', '["qui 15-13"]', ["Turma Ficticia Dois", "qui 15-13"]),
        # B10: a gramática é estrita (ASCII, sem espaço sobrando, sem LF final); cada entrada fora dela falha sozinha
        ("B10 dígitos arábico-índicos: 'ter ١٠-١٢'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter ١٠-١٢"]', ['OPT001', '١٠-١٢']),
        ("B10 dígitos de largura total: 'ter １０-１２'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter １０-１２"]', ['OPT001', '１０-１２']),
        ('B10 LF final (escape \\n no literal JS)', H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-12\\n"]', ['OPT001', 'ter 10-12']),
        ('B10 CR final (escape \\r no literal JS)', H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-12\\r"]', ['OPT001', 'ter 10-12']),
        ("B10 dois espaços: 'ter  10-12'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter  10-12"]', ['OPT001', 'ter  10-12']),
        ("B10 espaço no fim: 'ter 10-12 '", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-12 "]', ['OPT001', 'ter 10-12 ']),
        ("B10 espaço no início: ' ter 10-12'", H, 'OPT001: ["ter 10-12"]', 'OPT001: [" ter 10-12"]', ['OPT001', ' ter 10-12']),
        ("B10 dia em maiúsculas: 'TER 10-12'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["TER 10-12"]', ['OPT001', 'TER 10-12']),
        ('B10 tabulação no lugar do espaço', H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter\\t10-12"]', ['OPT001', '10-12']),
        ("B10 travessão no lugar do hífen: 'ter 10–12'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10–12"]', ['OPT001', 'ter 10–12']),
        ("B10 hora com um dígito: 'ter 9-12'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 9-12"]', ['OPT001', 'ter 9-12']),
        ("B10 horário com minutos: 'ter 10:00-12:00'", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10:00-12:00"]', ['OPT001', '10:00-12:00']),
        ('B10 horário com LF final na turma sem código', H, '["qui 13-15"]', '["qui 13-15\\n"]', ['Turma Ficticia Dois', 'qui 13-15']),
        ('B10 código com LF final', H, 'OPT001: ["ter 10-12"]', '"OPT001\\n": ["ter 10-12"]', ['OPT001', 'formato inválido']),
        ('B10 código com dígito arábico-índico', H, 'OPT001: ["ter 10-12"]', '"OPT00١": ["ter 10-12"]', ['OPT00', 'formato inválido']),
        ("B10 'consultado' com LF final", H, '"2026-01-01",\n  impar', '"2026-01-01\\n",\n  impar', ['consultado']),
        ("B10 'consultado' com dígitos arábico-índicos", H, '"2026-01-01",\n  impar', '"٢٠٢٦-٠١-٠١",\n  impar', ['consultado']),
        # duplicata, mesmo idêntica
        ("duplicata idêntica: código em horarios (mesma paridade)", H, 'OPT001: ["ter 10-12"],',
         'OPT001: ["ter 10-12"],\n    OPT001: ["ter 10-12"],', ["OPT001", "duplicada", "idêntica"]),
        ("duplicata com horários diferentes: código em horarios", H, 'OPT001: ["ter 10-12"],',
         'OPT001: ["ter 10-12"],\n    OPT001: ["ter 14-16"],', ["OPT001", "duplicada", "diferentes"]),
        ("duplicata idêntica: turma sem código", H, '{ name: "Turma Ficticia Dois", horarios: ["qui 13-15"] },',
         '{ name: "Turma Ficticia Dois", horarios: ["qui 13-15"] },\n      { name: "Turma Ficticia Dois", horarios: ["qui 13-15"] },',
         ["Turma Ficticia Dois", "duplicado", "idêntica"]),
        ("duplicata: horário repetido na mesma entrada", H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 10-12", "ter 10-12"]', ["OPT001", "repetido"]),
        ("duplicata idêntica: código em guia", G, "OPT001: { nivel: 2 },", "OPT001: { nivel: 2 },\n    OPT001: { nivel: 2 },",
         ["OPT001", "duplicada", "idêntica"]),
        ("duplicata idêntica: sem código em guia", G, '"Turma Ficticia Um": { nivel: 3 },',
         '"Turma Ficticia Um": { nivel: 3 },\n    "Turma Ficticia Um": { nivel: 3 },', ["Turma Ficticia Um", "duplicada", "idêntica"]),
    ]
    for nome, arq, de, para, ident in variantes:
        falha_com("17d " + nome, roda(arq, de, para), *ident, so_essas=False)
    # cada variante isolada: o defeito é o único erro (a base é válida) — confere o conjunto todo
    r = roda(H, 'OPT001: ["ter 10-12"]', 'OPT001: ["ter 12-10"]')
    registra("17d A variante isolada produz só o erro da entrada (um erro, o da entrada)",
             len(r["erros"]) == 1 and "OPT001" in r["erros"][0], " | ".join(r["erros"]))

    # 17e: turmas sem código
    r = roda(excecoes={"excecoes": []})
    nomes = {s["nome"] for s in r["sem_codigo"]}
    registra("17e Sem exceções, todas as turmas sem código são listadas e cada uma falha",
             nomes == {"Turma Ficticia Um", "Turma Ficticia Dois"}
             and sum("turma sem código e sem exceção" in e for e in r["erros"]) == 2
             and sum("entrada sem código e sem exceção" in e for e in r["erros"]) == 1
             and len(r["sem_codigo"]) == 3,
             str(r["sem_codigo"]) + " | " + " | ".join(r["erros"]))
    r = roda(excecoes={"excecoes": [excecao(nome="Turma Ficticia Dois")]})
    marc = {(s["arquivo"], s["nome"]): s["excecao"] for s in r["sem_codigo"]}
    registra("17e Com exceção só para uma, o relatório distingue a justificada da sem exceção",
             marc == {("horarios", "Turma Ficticia Um"): False, ("horarios", "Turma Ficticia Dois"): True,
                      ("guia", "Turma Ficticia Um"): False} and len(r["erros"]) == 2,
             str(marc) + " | " + " | ".join(r["erros"]))
    r = roda()
    registra("17e Com as duas exceções o relatório lista as turmas e todas aparecem justificadas",
             len(r["sem_codigo"]) == 3 and all(s["excecao"] for s in r["sem_codigo"]) and not r["erros"], str(r["sem_codigo"]))
    # leitor de literais: chaves repetidas só aparecem no texto, e as bordas do formato
    r = roda("horarios", "  impar: {", "  impar: {  // comentário\n    /* outro */", excecoes=None)
    registra("Leitor aceita comentários e vírgula final", not r["erros"], " | ".join(r["erros"]))
    registra("Leitor falha com literal quebrado, identificando arquivo e linha", _quebrado(), "não falhou")


def _quebrado():
    t = dict(BASE)
    t["guia"] = GUIA.replace('fonte: "Fonte ficticia",', 'fonte: "Fonte ficticia', 1)
    try:
        ref.valida_textos(t, EXC_BASE)
    except ref.ErroLeitura as e:
        return "js/guia.js" in str(e) and "linha" in str(e)
    return False


# ---------------------------------------------------------------- dados reais
def casos_reais(ref_git=None):
    textos = {a: ref.le_texto(a, ref_git) for a in ref.ARQUIVOS}
    dados, dups = ref.carrega(textos)
    exc = ref.carrega_excecoes()
    r = ref.valida(dados, dups, exc)
    registra("Dados reais: horarios.js e guia.js passam com as exceções versionadas", not r["erros"], " | ".join(r["erros"]))
    registra("Dados reais: nenhuma exceção sobrando (todas usadas)", not r["excecoes_sem_uso"], str(r["excecoes_sem_uso"]))
    sem = ref.valida(dados, dups, {"excecoes": []})
    esperados = ["EET100", "EEL891", "Comp 3 (condicionada)", "Tóp. Ciência de Dados: Estrutura de Dados",
                 "Mapas (livre escolha)", "Grafos de Interseção (mestrado)"]
    registra("Dados reais sem exceções: falha e identifica as seis pendências conhecidas",
             all(any(x in e for e in sem["erros"]) for x in esperados), " | ".join(sem["erros"]))
    return r, sem


# ---------------------------------------------------------------- 17f (navegador)
DESCRICAO = 'Use <b>negrito</b> & <img src=x onerror="window.__ficticio=1"> com "aspas" e \'apóstrofos\' &amp; &lt;script&gt;'
AVALIACAO = 'P1 < P2 & "trabalho" > nota'
DICAS = "Dica com <u>tag</u> & aspas \"duplas\""
GUIA_17F = GUIA.replace('OPT001: { nivel: 2 },', "").replace("AAA111", "COC602").replace(
    'descricao: "Descricao ficticia."',
    "descricao: " + json.dumps(DESCRICAO) + ", avaliacao: " + json.dumps(AVALIACAO) + ", dicas: " + json.dumps(DICAS)
).replace('"Turma Ficticia Um": { nivel: 3 },', "")


def caso_17f(args):
    from playwright.sync_api import sync_playwright, expect
    import runner
    from auditoria import observa
    # a fixture é válida para o validador (guia fictício + catálogo e currículo reais)
    textos = {a: ref.le_texto(a, args.ref) for a in ref.ARQUIVOS}
    textos["guia"] = GUIA_17F
    r = ref.valida_textos(textos, ref.carrega_excecoes())
    erros_guia = [e for e in r["erros"] if "guia" in e]
    registra("17f A fixture de guia é válida para o validador", not erros_guia, " | ".join(erros_guia))

    args.out.mkdir(parents=True)
    site = args.out / "site" / "grade"
    runner.exporta_site(args.ref, site)
    (site / "js" / "guia.js").write_text(GUIA_17F, encoding="utf-8")
    perfil = json.loads((TESTES / "fixtures" / "perfil-ficticio.json").read_text(encoding="utf-8"))
    eventos, avisos = [], []
    with runner.acesso(site, args.transport) as (url, _), sync_playwright() as pw:
        with getattr(pw, args.browser).launch(headless=True) as nav:
            ctx = nav.new_context(viewport={"width": 1440, "height": 900})
            observa(ctx, url, "17f", eventos, avisos)
            pg = ctx.new_page()
            pg.goto(url)
            pg.wait_for_load_state("load")
            pg.evaluate("""([p, k]) => { localStorage.setItem(k + 'perfilImportado', JSON.stringify(p));
                localStorage.setItem(k + 'atalhos', JSON.stringify(['perfil', 'importar', 'tema', 'privacidade', 'referencias', 'tags'])); }""",
                        [perfil, "gradeECI.v2."])
            pg.reload()
            pg.wait_for_load_state("load")
            if pg.locator("#modo-classico").is_checked():
                pg.locator(".interruptor").click()
            pg.click('[data-vista="optativas"]')
            pg.click('[data-abrir="COC602"]')
            expect(pg.locator("#detalhes .guia")).to_be_visible()
            guia = pg.locator("#detalhes .guia")
            texto = guia.inner_text()
            ps = guia.locator("p").all_inner_texts()
            literais = [DESCRICAO in texto, AVALIACAO in texto, DICAS in texto]
            filhos = pg.evaluate("""() => [...document.querySelectorAll('#detalhes .guia *')].map((e) => e.tagName)""")
            extras = [t for t in filhos if t not in ("P", "B")]     # o app usa só <p> e <b> aqui
            injetado = pg.evaluate("""() => {
                const d = [...document.querySelectorAll('#detalhes .guia p')].find((p) => p.textContent.includes('negrito'));
                return { descFilhos: d ? d.children.length : -1, u: document.querySelectorAll('#detalhes .guia u').length,
                         img: document.querySelectorAll('#detalhes .guia img').length,
                         script: document.querySelectorAll('#detalhes .guia script').length, exec: window.__ficticio === 1 };
            }""")
            pg.screenshot(path=str(args.out / "17f-detalhe-optativa.png"))
            ctx.close()
    registra(f"17f ({args.browser}/{args.transport}) <, &, aspas e apóstrofos aparecem literalmente na descrição, avaliação e dicas",
             all(literais), texto)
    # na descrição o único elemento filho permitido é o próprio <p>; <b> só no cabeçalho do app e em "Avaliação:" / "Dicas:"
    registra(f"17f ({args.browser}/{args.transport}) o trecho não cria elementos HTML (nenhum <u>, <img>, <script>; <b> do texto não vira negrito) nem executa atributo",
             injetado["descFilhos"] == 0 and not extras and injetado["u"] == 0 and injetado["img"] == 0 and injetado["script"] == 0 and not injetado["exec"]
             and DESCRICAO in ps, f"{extras} {injetado} {ps}")
    registra(f"17f ({args.browser}/{args.transport}) sem eventos inesperados de navegação", not eventos, "; ".join(eventos))


# ---------------------------------------------------------------- execução
def principal():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ref", default="HEAD", help="commit dos dados reais e do app (padrão: HEAD para o 17f; os dados reais usam o diretório de trabalho se omitido)")
    ap.add_argument("--browser", choices=("chromium", "firefox", "webkit"), help="roda também o 17f neste motor")
    ap.add_argument("--transport", choices=("file", "http"), default="file")
    ap.add_argument("--out", help="diretório novo, fora do repositório (necessário com --browser)")
    ap.add_argument("--relatorio", help="grava o relatório do validador nos dados reais (JSON)")
    args = ap.parse_args()
    if bool(args.browser) != bool(args.out):
        ap.error("--browser e --out andam juntos")
    ref_dados = args.ref if "--ref" in sys.argv else None
    casos_sinteticos()
    real, sem = casos_reais(ref_dados)
    if args.browser:
        import runner
        args.out = runner.caminho_saida(args.out)
        caso_17f(args)
    for ok, nome, detalhe in OCORRENCIAS:
        print(("OK    " if ok else "FALHA ") + nome)
        if not ok:
            print("      " + detalhe.replace("\n", "\n      ")[:1500])
    passou = sum(ok for ok, *_ in OCORRENCIAS)
    print(f"{passou}/{len(OCORRENCIAS)} casos OK")
    print("\n--- validador nos dados reais ---")
    ref.imprime(real)
    if args.relatorio:
        Path(args.relatorio).write_text(json.dumps({"reais": real, "sem_excecoes": sem,
                                                    "casos": [{"ok": o, "caso": n, "detalhe": d} for o, n, d in OCORRENCIAS]},
                                                   ensure_ascii=False, indent=2), encoding="utf-8")
    return 0 if passou == len(OCORRENCIAS) else 1


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(principal())
