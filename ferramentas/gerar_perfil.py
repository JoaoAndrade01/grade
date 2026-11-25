#!/usr/bin/env python3
"""
gerar_perfil.py — Gera o perfil/perfil.js a partir dos PDFs exportados do SIGA.

Uso:
    pip install pypdf
    python ferramentas/gerar_perfil.py --historico historico.pdf [--historico historico_curso_anterior.pdf] \
                                       --boa boa.pdf [--mesclar perfil/perfil.js] [-o perfil/perfil.js]

Este script é o espelho em Python de js/siga.js (usado pelo botão "Importar do SIGA" do app).
As regras (expressões regulares e passos de montagem) são as MESMAS e têm os MESMOS nomes.
Ao alterar uma, altere a outra e rode: bash ferramentas/testar_paridade.sh <pdfs...>

Privacidade: o script não lê nome, matrícula, CPF, RG, filiação nem endereço.
"""
import argparse
import datetime
import json
import os
import re
import sys

VERSAO = "1.0"

# --------------------------------------------------------------------------
# Expressões regulares (idênticas às de js/siga.js -> RE)
# --------------------------------------------------------------------------
RE = {
    "histLinha": re.compile(r"^(?:(\d{4}(?:/\d)?)\s+)?([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d)\s+([\d.,]+)\s+(\d+(?:\.\d+)?|T|\*+|-+)\s+(\d+\.\d)\s+([\d.,]+|\*+)\s+(AP|RM|RF|RFM|TR|DP|IN|CA)\b"),
    "histPeriodo": re.compile(r"^(\d{4}(?:/\d)?)\b"),
    "origemTitulo": re.compile(r"Disciplina origem da Dispensa:?\s*(.*)$"),
    "origemCodigo": re.compile(r"^([A-Z]{3}[A-Z0-9]{3})\b"),
    "boaEmissao": re.compile(r"(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}"),
    "boaElenco": re.compile(r"^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d|NCC)\s+(\d+)(?:\s+(\d{1,2}))?\s+(.*)$"),
    "boaNaoExplicitada": re.compile(r"^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s+(\d+\.\d)\s+(\d+)\s+(\d+(?:\.\d+)?|T)$"),
    "boaReprovacao": re.compile(r"^([A-Z]{3}[A-Z0-9]{3})\s+(.+?)\s*->\s*(\d+)\s+vez\(es\)\s+(.*)$"),
}


def num(s):
    """'7.4' -> 7.4 ; '10.0' -> 10 (inteiros saem sem casa decimal, como no JavaScript)."""
    v = float(re.sub(r"\.(?=\d{3}\b)", "", str(s)).replace(",", "."))
    return int(v) if v.is_integer() else v


def normalizar_linhas(texto):
    linhas = texto if isinstance(texto, list) else str(texto).splitlines()
    return [x for x in (re.sub(r"\s+", " ", l).strip() for l in linhas) if x]


TITULO_BOA = re.compile(r"^BOLETIM DE ORIENTA[ÇC][ÃA]O ACAD[ÊE]MICA\b", re.I)
COLUNAS_BOA = re.compile(r"^Aluno\s+Matr[íi]cula\b.*\bEmiss[ãa]o\s*$", re.I)
COLUNAS_HIST = re.compile(r"^Per[íi]odo\s+C[óo]digo\b.*\bCrR\s+CH\s+Grau\s+CrO\s+Pontos\s+SF\b", re.I)
SECAO_NE = re.compile(r"Cursadas e N[ãa]o Explicitadas", re.I)
SECAO_ELENCO = re.compile(r"Atividades Acad[êe]micas (Obrigat[óo]rias|Optativas)", re.I)
SECAO_REPROV = re.compile(r"Frequ[êe]ncia de reprova", re.I)
TOTAL_NE = re.compile(r"^Total(:| de Livre)", re.I)


def filtrar_pagina_pdf(texto):
    """Espelho de filtrarPaginaPDF em siga.js."""
    linhas = normalizar_linhas(texto or "")
    boa = next((i for i, l in enumerate(linhas) if TITULO_BOA.match(l)), None)
    if boa is not None:
        cabecalho = next((i for i in range(boa + 1, len(linhas)) if COLUNAS_BOA.match(linhas[i])), None)
        if cabecalho is None:
            return []
        saida = ["BOLETIM DE ORIENTAÇÃO ACADÊMICA"]
        emissao = RE["boaEmissao"].search(linhas[cabecalho + 1]) if cabecalho + 1 < len(linhas) else None
        if emissao:
            saida.append(emissao.group(0))
        for l in linhas[cabecalho + 2:]:
            if SECAO_NE.search(l):
                saida.append("Cursadas e Não Explicitadas")
            elif SECAO_ELENCO.search(l):
                saida.append("Atividades Acadêmicas Obrigatórias")
            elif SECAO_REPROV.search(l):
                saida.append("Frequência de reprovações")
            elif TOTAL_NE.match(l):
                saida.append("Total:")
            elif RE["boaNaoExplicitada"].match(l):
                saida.append(l)
            else:
                rp = RE["boaReprovacao"].match(l)
                if rp:
                    periodos = re.findall(r"\d{4}/\d", rp.group(4))
                    if periodos:
                        saida.append(l[:rp.start(4)] + " ".join(periodos))
                    continue
                el = RE["boaElenco"].match(l)
                if el:
                    situacao = re.match(r"^Cursando\b", el.group(6), re.I) or RE["origemCodigo"].match(el.group(6))
                    if situacao:
                        saida.append(l[:el.start(6)] + situacao.group(0))
        return saida

    cabecalho = next((i for i, l in enumerate(linhas) if COLUNAS_HIST.match(l)), None)
    if cabecalho is None:
        return []
    saida, aguardando_origem = [], False
    for l in linhas[cabecalho + 1:]:
        registro = RE["histLinha"].match(l)
        if registro:
            saida.append(registro.group(0))
            aguardando_origem = False
        elif re.match(r"^Disciplina origem da Dispensa:?(?:\s|$)", l):
            codigo = RE["origemCodigo"].match(RE["origemTitulo"].search(l).group(1))
            saida.append("Disciplina origem da Dispensa:" + (" " + codigo.group(1) if codigo else ""))
            aguardando_origem = not codigo
        elif aguardando_origem and RE["origemCodigo"].match(l):
            saida.append(RE["origemCodigo"].match(l).group(1))
            aguardando_origem = False
        elif re.match(r"^\d{4}(?:/\d)?(?:$|\s+Matr[íi]cula\b)", l, re.I):
            saida.append(RE["histPeriodo"].match(l).group(1))
    return saida


def texto_pdf(caminho):
    """Extrai somente as linhas acadêmicas identificadas no layout de cada página."""
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit("Instale a dependência: pip install pypdf")
    return "\n".join(l for p in PdfReader(caminho).pages
                     for l in filtrar_pagina_pdf(p.extract_text(extraction_mode="layout")))


# --------------------------------------------------------------------------
# Histórico
# --------------------------------------------------------------------------
def ler_historico(texto):
    registros, periodo, aguardando = [], None, None
    for l in normalizar_linhas(texto):
        m = RE["histLinha"].search(l)
        if m:
            if m.group(1):
                periodo = m.group(1)
            r = {"periodo": periodo, "code": m.group(2), "name": m.group(3).strip(), "credits": num(m.group(4)),
                 "ch": num(m.group(5)), "grau": m.group(6), "sf": m.group(9)}
            registros.append(r)
            aguardando = r if r["grau"] == "T" else None
            continue
        o = RE["origemTitulo"].search(l)
        if o:
            c = RE["origemCodigo"].search(o.group(1) or "")
            if c and aguardando:
                aguardando["dispensaDe"] = c.group(1)
                aguardando = None
            continue
        if aguardando and "dispensaDe" not in aguardando:
            c = RE["origemCodigo"].search(l)
            if c:
                aguardando["dispensaDe"] = c.group(1)
                aguardando = None
                continue
        p = RE["histPeriodo"].search(l)
        if p:
            periodo = p.group(1)
    return {"registros": registros}


# --------------------------------------------------------------------------
# BOA
# --------------------------------------------------------------------------
def ler_boa(texto):
    out = {"emissao": None, "cursando": [], "equivalencias": [], "naoExplicitadas": [], "reprovacoes": []}
    secao = None
    for l in normalizar_linhas(texto):
        if not out["emissao"]:
            e = RE["boaEmissao"].search(l)
            if e:
                out["emissao"] = e.group(1)
        if SECAO_NE.search(l):
            secao = "ne"; continue
        if SECAO_ELENCO.search(l):
            secao = "elenco"; continue
        if SECAO_REPROV.search(l):
            secao = "reprov"; continue
        if TOTAL_NE.match(l) and secao == "ne":
            secao = None; continue

        if secao == "ne":
            m = RE["boaNaoExplicitada"].search(l)
            if m:
                out["naoExplicitadas"].append({"code": m.group(1), "name": m.group(2).strip(), "credits": num(m.group(3)),
                                               "ch": num(m.group(4)), "grau": m.group(5)})
            continue
        r = RE["boaReprovacao"].search(l)
        if r:
            out["reprovacoes"].append({"code": r.group(1), "name": r.group(2).strip(),
                                       "periodos": re.findall(r"\d{4}/\d", r.group(4))})
            continue
        if secao == "elenco":
            m = RE["boaElenco"].search(l)
            if not m:
                continue
            resto = m.group(6).strip()
            if re.match(r"^Cursando\b", resto, re.I):
                out["cursando"].append({"code": m.group(1), "name": m.group(2).strip(),
                                        "credits": 0 if m.group(3) == "NCC" else num(m.group(3)), "ch": num(m.group(4))})
            else:
                c = RE["origemCodigo"].match(resto)
                if c and c.group(1) != m.group(1):
                    out["equivalencias"].append({"recomendada": m.group(1), "cursada": c.group(1)})
    return out


# --------------------------------------------------------------------------
# Montagem do perfil (espelho de montarPerfil em js/siga.js)
# --------------------------------------------------------------------------
def chave_periodo(p):
    m = re.match(r"^(\d{4})(?:/(\d))?", p or "")
    return int(m.group(1)) * 10 + (int(m.group(2)) if m.group(2) else 0) if m else 0


def proximo_periodo(p):
    m = re.match(r"^(\d{4})/(\d)$", p or "")
    if not m:
        return None
    return f"{int(m.group(1)) + 1}/1" if int(m.group(2)) >= 2 else f"{m.group(1)}/2"


def montar_perfil(historicos, boa=None, curriculo=None, catalogo=None, anterior=None, hoje=None):
    curriculo, catalogo = curriculo or {}, catalogo or {}
    conhecido = lambda c: c in curriculo or c in catalogo
    ace = lambda c: (curriculo.get(c) or catalogo.get(c) or {}).get("category") == 5

    # 1) registros de todos os históricos, sem duplicar o bloco de transferidos
    todos = [dict(r) for h in historicos for r in h["registros"]]
    em_semestre = {f'{r["code"]}|{r["sf"]}|{r["grau"]}' for r in todos if "/" in (r["periodo"] or "")}
    vistos, regs = set(), []
    for r in todos:
        real = "/" in (r["periodo"] or "")
        if not real and f'{r["code"]}|{r["sf"]}|{r["grau"]}' in em_semestre:
            continue
        k = f'{r["periodo"] if real else "T"}|{r["code"]}|{r["sf"]}|{r["grau"]}'
        if k in vistos:
            continue
        vistos.add(k)
        regs.append(r)

    # 2) dispensas
    origens_aprovadas = {r["code"] for r in regs if r["grau"] != "T" and r["sf"] == "AP"}
    dispensas = {}
    for r in regs:
        if r["grau"] == "T" and r["sf"] == "AP" and r.get("dispensaDe") in origens_aprovadas:
            dispensas.setdefault(r["dispensaDe"], []).append(r["code"])

    # 3) equivalências do BOA
    equivale = {}
    for e in (boa or {}).get("equivalencias", []):
        if e["cursada"] not in equivale and e["cursada"] != e["recomendada"]:
            equivale[e["cursada"]] = e["recomendada"]

    # 4) períodos cursados
    periodos = {}
    for r in regs:
        if r["grau"] == "T" and r["sf"] == "AP" and r.get("dispensaDe") in origens_aprovadas:
            continue
        nome = r["periodo"] if "/" in (r["periodo"] or "") else f'{r["periodo"] or "?"} (transferidas)'
        item = {"code": r["code"]}
        if not conhecido(r["code"]):
            item.update({"name": r["name"], "credits": r["credits"], "category": 3})
        if r["grau"] == "T":
            item["nota"] = "T"
        else:
            if r["code"] in equivale:
                item["equivale"] = equivale[r["code"]]
            if r["code"] in dispensas and r["sf"] == "AP":
                item["dispensa"] = list(dict.fromkeys(dispensas[r["code"]]))
        if r["sf"] != "AP":
            item["status"] = "reprovado"
        if re.match(r"^\d+(\.\d+)?$", r["grau"]):
            item["nota"] = num(r["grau"])
        periodos.setdefault(nome, []).append(item)

    # 5) reprovações do BOA
    for rp in (boa or {}).get("reprovacoes", []):
        for p in rp["periodos"]:
            if p.endswith("/0"):
                continue
            lista = periodos.get(p, [])
            if not any(i["code"] == rp["code"] and i.get("status") == "reprovado" for i in lista):
                item = {"code": rp["code"], "status": "reprovado"}
                if not conhecido(rp["code"]):
                    item.update({"name": rp["name"], "category": 3})
                periodos.setdefault(p, []).append(item)

    nomes = sorted(periodos, key=lambda n: (chave_periodo(n), n))
    saida = [{"nome": n, "disciplinas": periodos[n]} for n in nomes]

    # 6) período atual (Cursando no BOA)
    ultimo = ([n for n in nomes if re.match(r"^\d{4}/\d$", n)] or [None])[-1]
    atual_nome = proximo_periodo(ultimo) or "atual"
    extensao_boa, atual_itens = [], []
    for c in (boa or {}).get("cursando", []):
        if ace(c["code"]):
            extensao_boa.append({"nome": c["name"], "code": c["code"], "horas": c["ch"], "periodo": atual_nome, "status": "em andamento"})
            continue
        item = {"code": c["code"]}
        if not conhecido(c["code"]):
            item.update({"name": c["name"], "credits": c["credits"], "category": 3})
        atual_itens.append(item)
    if atual_itens:
        saida.append({"nome": atual_nome, "atual": True, "disciplinas": atual_itens})

    # 7) mescla com o perfil anterior
    anterior = anterior or {}
    perfil = {
        "titulo": anterior.get("titulo") or "Grade ECI",
        "subtitulo": anterior.get("subtitulo") or "Engenharia de Computação e Informação · UFRJ",
        "curso": anterior["curso"] if anterior.get("curso") is not None else 1,
        "fonte": {"geradoPor": f"siga.js {VERSAO}", "geradoEm": hoje or datetime.datetime.now(datetime.timezone.utc).date().isoformat(),
                  "boaEmissao": (boa or {}).get("emissao")},
    }
    if anterior.get("nome"):
        perfil["nome"] = anterior["nome"]
    if boa:
        perfil["boa"] = {"emissao": boa["emissao"], "naoExplicitadas": boa["naoExplicitadas"]}
    perfil["equivalencias"] = anterior.get("equivalencias") or []
    ext = list(anterior.get("extensao") or [])
    for e in extensao_boa:
        if not any(x.get("code") and x.get("code") == e["code"] for x in ext):
            ext.append(e)
    perfil["extensao"] = ext
    for k in ("tags", "marcacoes"):
        if anterior.get(k) is not None:
            perfil[k] = anterior[k]

    if anterior.get("periodos"):
        ant_atual = next((p for p in anterior["periodos"] if p.get("atual")), None)
        atual = next((p for p in saida if p.get("atual")), None)
        if ant_atual and atual and ant_atual["nome"] == atual["nome"]:
            ant_itens = [{"code": d} if isinstance(d, str) else d for d in ant_atual.get("disciplinas", [])]
            for it in atual["disciplinas"]:
                v = next((d for d in ant_itens if d.get("code") == it["code"]), None)
                if v:
                    if v.get("horarios") is not None: it["horarios"] = v["horarios"]
                    if v.get("status"): it["status"] = v["status"]
        corte = chave_periodo(atual["nome"] if atual else ultimo)
        nomes_ocupados = {p["nome"] for p in saida}
        saida += [p for p in anterior["periodos"] if p.get("planejado")
                  and (not chave_periodo(p["nome"]) or chave_periodo(p["nome"]) > corte)
                  and p["nome"] not in nomes_ocupados]
    perfil["periodos"] = saida
    return perfil


# --------------------------------------------------------------------------
# Leitura dos dados do app (currículo e catálogo) e do perfil anterior
# --------------------------------------------------------------------------
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ler_curriculo(curso=1):
    """Extrai {code: {category}} da lista `curso` de js/database.js."""
    txt = open(os.path.join(RAIZ, "js", "database.js"), encoding="utf-8").read()
    ini = txt.index("window.courses")
    ini = txt.index("[", ini) + 1
    blocos, prof, inicio = [], 0, None
    for i in range(ini, len(txt)):
        ch = txt[i]
        if ch == "[":
            prof += 1
            if prof == 1: inicio = i
        elif ch == "]":
            if prof == 0: break
            prof -= 1
            if prof == 0: blocos.append(txt[inicio:i])
    out = {}
    for obj in re.findall(r"\{[^{}]*\}", blocos[curso]):
        c = re.search(r'code:\s*"([A-Z0-9]+)"', obj)
        if c:
            cat = re.search(r"category:\s*(\d)", obj)
            out[c.group(1)] = {"category": int(cat.group(1)) if cat else 1}
    return out


def ler_catalogo(curso=1):
    """Extrai {code: {category}} de js/optativas.js (um objeto JSON por linha)."""
    out, dentro = {}, False
    for l in open(os.path.join(RAIZ, "js", "optativas.js"), encoding="utf-8"):
        if l.startswith(f"window.optativas[{curso}]"):
            dentro = True; continue
        if dentro and l.strip().startswith("{"):
            o = json.loads(l.strip().rstrip(","))
            out[o["code"]] = {"category": o.get("category", 2)}
        elif dentro and l.strip().startswith("]"):
            break
    return out


def ler_perfil_js(caminho):
    txt = open(caminho, encoding="utf-8").read()
    m = re.search(r"^\s*window\.PERFIL\s*=\s*", txt, re.M)
    return json.loads(re.sub(r";\s*$", "", txt[m.end():] if m else txt))


def texto_perfil(perfil):
    """Mesmo formato de exportação do app (um item por linha, fácil de revisar no git diff)."""
    listas = ("equivalencias", "extensao")
    linhas = ["{"]
    for k, v in perfil.items():
        if k in ("periodos",) + listas:
            continue
        linhas.append(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},")
    for k in listas:
        if k in perfil:
            linhas.append(f"  {json.dumps(k)}: [")
            linhas.append(",\n".join("    " + json.dumps(x, ensure_ascii=False) for x in perfil[k]))
            linhas.append("  ],")
    linhas.append('  "periodos": [')
    for i, p in enumerate(perfil["periodos"]):
        meta = {k: v for k, v in p.items() if k != "disciplinas"}
        linhas.append("    " + json.dumps(meta, ensure_ascii=False)[:-1] + ', "disciplinas": [')
        linhas.append(",\n".join("      " + json.dumps(d, ensure_ascii=False) for d in p.get("disciplinas", [])))
        linhas.append("    ]}" + ("," if i < len(perfil["periodos"]) - 1 else ""))
    linhas += ["  ]", "}"]
    return ("// Perfil gerado por ferramentas/gerar_perfil.py a partir dos PDFs do SIGA.\n"
            "// Salve como perfil/perfil.js (ignorado pelo git).\nwindow.PERFIL = " + "\n".join(linhas) + ";\n")


def main():
    ap = argparse.ArgumentParser(description="Gera perfil/perfil.js a partir do Histórico e do BOA do SIGA.")
    ap.add_argument("--historico", action="append", default=[], help="PDF do histórico (repita para mais de um curso)")
    ap.add_argument("--boa", help="PDF do BOA")
    ap.add_argument("--mesclar", help="perfil.js existente: preserva planejamento, pedidos, extensão e tags")
    ap.add_argument("--curso", type=int, default=1, help="índice do curso em js/database.js (ECI = 1)")
    ap.add_argument("--hoje", help="data fixa AAAA-MM-DD (para testes)")
    ap.add_argument("--json", action="store_true", help="imprime JSON puro (usado no teste de paridade)")
    ap.add_argument("--texto", action="store_true", help="os arquivos já são .txt extraídos (teste de paridade)")
    ap.add_argument("-o", "--saida", help="arquivo de saída (padrão: imprime na tela)")
    a = ap.parse_args()
    if not a.historico and not a.boa:
        ap.error("informe ao menos um --historico ou --boa")
    ler = (lambda c: open(c, encoding="utf-8").read()) if a.texto else texto_pdf
    perfil = montar_perfil(
        historicos=[ler_historico(ler(h)) for h in a.historico],
        boa=ler_boa(ler(a.boa)) if a.boa else None,
        curriculo=ler_curriculo(a.curso), catalogo=ler_catalogo(a.curso),
        anterior=ler_perfil_js(a.mesclar) if a.mesclar else None, hoje=a.hoje)
    saida = json.dumps(perfil, ensure_ascii=False, sort_keys=True) if a.json else texto_perfil(perfil)
    if a.saida:
        open(a.saida, "w", encoding="utf-8").write(saida)
        print(f"Perfil gravado em {a.saida}: {len(perfil['periodos'])} períodos.", file=sys.stderr)
    else:
        print(saida)


if __name__ == "__main__":
    main()
