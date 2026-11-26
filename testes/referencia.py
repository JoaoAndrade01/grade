"""Valida os dados de referência da Grade (js/horarios.js e js/guia.js), RF-17.

A validação é local: lê os arquivos como texto, sem executar JavaScript e sem rede.
Um leitor próprio de literais JS enxerga chaves repetidas (o motor JS as sobrescreve
em silêncio). Código desconhecido sem exceção justificada e entrada inválida
fazem o programa terminar com código 1.

Identidade das entradas (duas entradas com a mesma identidade são duplicatas, mesmo
idênticas):
  horarios: (curso, paridade, código); semCodigo: (curso, paridade, nome)
  guia:     (curso, código);           semCodigo: (curso, nome)
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

TESTES = Path(__file__).resolve().parent
REPO = TESTES.parent
EXCECOES = TESTES / "fixtures" / "excecoes-referencia.json"
ARQUIVOS = {"horarios": "js/horarios.js", "guia": "js/guia.js",
            "database": "js/database.js", "optativas": "js/optativas.js"}
EFEITOS = ("somente-informativo", "entra-no-calculo")
CODIGO = re.compile(r"^[A-Z]{3}[A-Z0-9]{3}$")
HORARIO = re.compile(r"^(seg|ter|qua|qui|sex) (\d{2})-(\d{2})$")
PRESENCAS = ("com", "sem", "depende")


# ---------------------------------------------------------------- leitor de literais JS
class ErroLeitura(ValueError):
    pass


class Leitor:
    """Lê um literal JS (objetos, listas, textos, números, true/false/null, comentários)."""

    def __init__(self, texto, inicio, rotulo):
        self.t, self.i, self.rotulo = texto, inicio, rotulo
        self.duplicadas = []        # (caminho, chave, identica)

    def erro(self, msg):
        linha = self.t.count("\n", 0, self.i) + 1
        raise ErroLeitura(f"{self.rotulo}, linha {linha}: {msg}")

    def espaco(self):
        t = self.t
        while self.i < len(t):
            if t[self.i].isspace():
                self.i += 1
            elif t.startswith("//", self.i):
                fim = t.find("\n", self.i)
                self.i = len(t) if fim < 0 else fim
            elif t.startswith("/*", self.i):
                fim = t.find("*/", self.i + 2)
                if fim < 0:
                    self.erro("comentário não fechado")
                self.i = fim + 2
            else:
                break

    def valor(self, caminho):
        self.espaco()
        c = self.t[self.i:self.i + 1]
        if c == "{":
            return self.objeto(caminho)
        if c == "[":
            return self.lista(caminho)
        if c in "\"'":
            return self.texto()
        m = re.compile(r"-?\d+(?:\.\d+)?").match(self.t, self.i)
        if m:
            self.i = m.end()
            return float(m.group()) if "." in m.group() else int(m.group())
        m = re.compile(r"true|false|null").match(self.t, self.i)
        if m:
            self.i = m.end()
            return {"true": True, "false": False, "null": None}[m.group()]
        self.erro(f"valor inesperado: {self.t[self.i:self.i + 20]!r}")

    def texto(self):
        aspa = self.t[self.i]
        self.i += 1
        saida = []
        escapes = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "'": "'", "/": "/"}
        while self.i < len(self.t):
            c = self.t[self.i]
            if c == aspa:
                self.i += 1
                return "".join(saida)
            if c == "\\":
                n = self.t[self.i + 1]
                if n == "u":
                    saida.append(chr(int(self.t[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                saida.append(escapes.get(n, n))
                self.i += 2
                continue
            if c == "\n":
                self.erro("texto sem fechar na linha")
            saida.append(c)
            self.i += 1
        self.erro("texto não fechado")

    def chave(self):
        self.espaco()
        if self.t[self.i:self.i + 1] in "\"'":
            return self.texto()
        m = re.compile(r"[A-Za-z_$][\w$]*|\d+").match(self.t, self.i)
        if not m:
            self.erro(f"chave inesperada: {self.t[self.i:self.i + 20]!r}")
        self.i = m.end()
        return m.group()

    def objeto(self, caminho):
        self.i += 1
        saida = {}
        while True:
            self.espaco()
            if self.t[self.i:self.i + 1] == "}":
                self.i += 1
                return saida
            k = self.chave()
            self.espaco()
            if self.t[self.i:self.i + 1] != ":":
                self.erro(f"esperava ':' depois de {k!r}")
            self.i += 1
            v = self.valor(caminho + [k])
            if k in saida:
                self.duplicadas.append((caminho, k, saida[k] == v))
            else:
                saida[k] = v
            self.espaco()
            if self.t[self.i:self.i + 1] == ",":
                self.i += 1
            elif self.t[self.i:self.i + 1] != "}":
                self.erro("esperava ',' ou '}'")

    def lista(self, caminho):
        self.i += 1
        saida = []
        while True:
            self.espaco()
            if self.t[self.i:self.i + 1] == "]":
                self.i += 1
                return saida
            saida.append(self.valor(caminho + [len(saida)]))
            self.espaco()
            if self.t[self.i:self.i + 1] == ",":
                self.i += 1
            elif self.t[self.i:self.i + 1] != "]":
                self.erro("esperava ',' ou ']'")


def le_atribuicao(texto, nome, rotulo):
    """Lê `window.<nome>[N] = <literal>` (por curso) ou `window.<nome> = <literal>`.

    Devolve ({curso|None: valor}, duplicadas) onde cada duplicada é (curso, caminho, chave, identica).
    """
    padrao = re.compile(rf"^window\.{nome}(?:\[(\d+)\])?[ \t]*=[ \t]*(?![ \t]|window\.)", re.M)
    achados, duplicadas = {}, []
    for m in padrao.finditer(texto):
        curso = int(m.group(1)) if m.group(1) else None
        leitor = Leitor(texto, m.end(), rotulo)
        if curso in achados:
            duplicadas.append((curso, [], f"window.{nome}", False))
        achados[curso] = leitor.valor([])
        duplicadas += [(curso, *d) for d in leitor.duplicadas]
    return achados, duplicadas


# ---------------------------------------------------------------- carga dos dados
def le_texto(arquivo, ref=None):
    caminho = ARQUIVOS[arquivo]
    if ref:
        return subprocess.run(["git", "-C", str(REPO), "show", f"{ref}:{caminho}"],
                              check=True, capture_output=True).stdout.decode("utf-8")
    return (REPO / caminho).read_text(encoding="utf-8")


def carrega(textos):
    """textos: {arquivo: conteúdo}. Devolve dict com horarios, guia, database, optativas e duplicadas."""
    dados, duplicadas = {}, {}
    for arq, nome in (("horarios", "horarios"), ("guia", "guia"), ("optativas", "optativas"), ("database", "courses")):
        valores, dups = le_atribuicao(textos[arq], nome, ARQUIVOS[arq])
        dados[arq], duplicadas[arq] = valores, dups
    return dados, duplicadas


def codigos_conhecidos(dados):
    """{curso: {código: 'currículo'|'catálogo'}}."""
    saida = {}
    cursos = dados["database"].get(None) or []
    for curso, lista in enumerate(cursos):
        saida.setdefault(curso, {})
        for c in lista:
            if isinstance(c, dict) and c.get("code"):
                saida[curso][c["code"]] = "currículo"
    for curso, lista in dados["optativas"].items():
        saida.setdefault(curso, {})
        for c in lista:
            if isinstance(c, dict) and c.get("code"):
                saida[curso].setdefault(c["code"], "catálogo")
    return saida


# ---------------------------------------------------------------- exceções
def carrega_excecoes(caminho=EXCECOES):
    return json.loads(Path(caminho).read_text(encoding="utf-8"))


def valida_excecoes(excecoes):
    erros = []
    for n, e in enumerate(excecoes.get("excecoes", [])):
        rot = f"exceção #{n + 1} ({e.get('codigo') or e.get('nome') or '?'})"
        if bool(e.get("codigo")) == bool(e.get("nome")):
            erros.append(f"{rot}: informe 'codigo' ou 'nome' (exatamente um)")
        for campo in ("origem", "motivo"):
            if not isinstance(e.get(campo), str) or not e[campo].strip():
                erros.append(f"{rot}: '{campo}' ausente ou vazio")
        if e.get("efeito") not in EFEITOS:
            erros.append(f"{rot}: 'efeito' deve ser um de {', '.join(EFEITOS)}")
        arqs = e.get("arquivos")
        if not isinstance(arqs, list) or not arqs or any(a not in ("horarios", "guia") for a in arqs):
            erros.append(f"{rot}: 'arquivos' deve listar 'horarios' e/ou 'guia'")
        if not isinstance(e.get("curso", 1), int):
            erros.append(f"{rot}: 'curso' deve ser inteiro")
    return erros


# ---------------------------------------------------------------- validação
def data_iso(v):
    try:
        return isinstance(v, str) and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", v)) and bool(date.fromisoformat(v))
    except ValueError:
        return False


def texto_ok(v):
    return isinstance(v, str) and bool(v.strip())


def valida_horarios_lista(lista, rot, erros):
    if not isinstance(lista, list) or not lista:
        erros.append(f"{rot}: horários devem ser uma lista não vazia")
        return
    vistos = set()
    for h in lista:
        m = HORARIO.match(h) if isinstance(h, str) else None
        if not m:
            erros.append(f"{rot}: horário malformado {h!r} (esperado 'ter 10-12': seg a sex, duas casas por hora)")
            continue
        ini, fim = int(m.group(2)), int(m.group(3))
        if ini > 23 or fim > 24:
            erros.append(f"{rot}: hora fora de 00 a 24 em {h!r}")
        elif ini >= fim:
            erros.append(f"{rot}: início não antecede o fim em {h!r}")
        if h in vistos:
            erros.append(f"{rot}: horário repetido {h!r}")
        vistos.add(h)


def valida(dados, duplicadas, excecoes, curriculo_ou_catalogo=None):
    """Devolve dict(erros, excecoes_usadas, excecoes_sem_uso, sem_codigo, avisos)."""
    erros, usadas, sem_codigo = [], set(), []
    conhecidos = codigos_conhecidos(dados) if curriculo_ou_catalogo is None else curriculo_ou_catalogo
    lista_exc = excecoes.get("excecoes", [])
    erros += [f"exceções: {e}" for e in valida_excecoes(excecoes)]
    por_codigo = {}
    for n, e in enumerate(lista_exc):
        if e.get("codigo"):
            for a in e.get("arquivos", []):
                por_codigo.setdefault((e.get("curso", 1), a, e["codigo"]), []).append(n)
    por_nome = {}
    for n, e in enumerate(lista_exc):
        if e.get("nome"):
            for a in e.get("arquivos", []):
                por_nome.setdefault((e.get("curso", 1), a, e["nome"]), []).append(n)

    def confere_codigo(curso, arq, codigo, rot):
        if not (isinstance(codigo, str) and CODIGO.match(codigo)):
            erros.append(f"{rot}: código com formato inválido {codigo!r}")
            return
        if codigo in conhecidos.get(curso, {}):
            return
        achou = por_codigo.get((curso, arq, codigo))
        if achou:
            usadas.update(achou)
            if any(lista_exc[n].get("efeito") == "entra-no-calculo" for n in achou):
                erros.append(f"{rot}: código {codigo} fora do currículo e do catálogo não pode ter efeito 'entra-no-calculo'")
            return
        erros.append(f"{rot}: código {codigo} não está no currículo, no catálogo nem nas exceções")

    for arq in ("horarios", "guia"):
        for curso, caminho, chave, identica in duplicadas[arq]:
            onde = "/".join(str(p) for p in caminho) or "raiz"
            erros.append(f"{ARQUIVOS[arq]} curso {curso}, {onde}: chave {chave!r} duplicada"
                         f" ({'idêntica' if identica else 'com valores diferentes'})")

    # --- horarios
    for curso, h in dados["horarios"].items():
        base = f"horarios[{curso}]"
        if curso is None or not isinstance(h, dict):
            erros.append(f"{base}: esperava um objeto por curso (window.horarios[N])")
            continue
        if not texto_ok(h.get("fonte")):
            erros.append(f"{base}: 'fonte' ausente ou vazia")
        if not data_iso(h.get("consultado")):
            erros.append(f"{base}: 'consultado' ausente ou fora de AAAA-MM-DD")
        for par in ("impar", "par"):
            grupo = h.get(par)
            if not isinstance(grupo, dict):
                erros.append(f"{base}.{par}: ausente ou não é objeto")
                continue
            for codigo, hs in grupo.items():
                rot = f"{base}.{par}.{codigo}"
                confere_codigo(curso, "horarios", codigo, rot)
                valida_horarios_lista(hs, rot, erros)
        sc = h.get("semCodigo", {})
        if not isinstance(sc, dict):
            erros.append(f"{base}.semCodigo: deve ser objeto")
            sc = {}
        for par, itens in sc.items():
            if par not in ("impar", "par") or not isinstance(itens, list):
                erros.append(f"{base}.semCodigo.{par}: esperava 'impar' ou 'par' com lista")
                continue
            vistos = {}
            for n, it in enumerate(itens):
                nome = it.get("name") if isinstance(it, dict) else None
                rot = f"{base}.semCodigo.{par}[{n}] ({nome!r})"
                if not isinstance(it, dict):
                    erros.append(f"{rot}: esperava objeto {{name, horarios}}")
                    continue
                for extra in sorted(set(it) - {"name", "horarios"}):
                    erros.append(f"{rot}: campo desconhecido {extra!r}")
                if not texto_ok(nome):
                    erros.append(f"{rot}: 'name' ausente ou vazio")
                    continue
                if "horarios" not in it:
                    erros.append(f"{rot}: 'horarios' ausente")
                else:
                    valida_horarios_lista(it["horarios"], rot, erros)
                if nome in vistos:
                    mesma = vistos[nome] == it.get("horarios")
                    erros.append(f"{rot}: nome duplicado na mesma paridade ({'idêntica' if mesma else 'horários diferentes'})")
                vistos[nome] = it.get("horarios")
                achou = por_nome.get((curso, "horarios", nome))
                if achou:
                    usadas.update(achou)
                sem_codigo.append({"arquivo": "horarios", "curso": curso, "paridade": par, "nome": nome,
                                   "horarios": it.get("horarios"), "excecao": bool(achou)})
                if not achou:
                    erros.append(f"{rot}: turma sem código e sem exceção justificada")

    # --- guia
    for curso, g in dados["guia"].items():
        base = f"guia[{curso}]"
        if curso is None or not isinstance(g, dict):
            erros.append(f"{base}: esperava um objeto por curso (window.guia[N])")
            continue
        if not texto_ok(g.get("fonte")):
            erros.append(f"{base}: 'fonte' ausente ou vazia")
        if not data_iso(g.get("consultado")):
            erros.append(f"{base}: 'consultado' ausente ou fora de AAAA-MM-DD")
        niveis = g.get("niveis")
        if not isinstance(niveis, dict) or sorted(niveis) != ["1", "2", "3", "4", "5"]:
            erros.append(f"{base}.niveis: esperava os níveis 1 a 5")
            niveis = {}
        for k, n in niveis.items():
            if not isinstance(n, dict) or not all(texto_ok(n.get(c)) for c in ("emoji", "nome", "texto")):
                erros.append(f"{base}.niveis.{k}: esperava emoji, nome e texto não vazios")
        obs = g.get("observacoes", [])
        if not isinstance(obs, list) or not all(texto_ok(o) for o in obs):
            erros.append(f"{base}.observacoes: esperava lista de textos não vazios")

        def entrada_guia(e, rot):
            if not isinstance(e, dict):
                erros.append(f"{rot}: esperava objeto")
                return
            for extra in sorted(set(e) - {"nivel", "presenca", "descricao", "avaliacao", "dicas"}):
                erros.append(f"{rot}: campo desconhecido {extra!r}")
            if "nivel" not in e:
                erros.append(f"{rot}: campo obrigatório 'nivel' ausente")
            elif isinstance(e["nivel"], bool) or e["nivel"] not in (1, 2, 3, 4, 5):
                erros.append(f"{rot}: 'nivel' deve ser inteiro de 1 a 5 (veio {e['nivel']!r})")
            if "presenca" in e and e["presenca"] not in PRESENCAS:
                erros.append(f"{rot}: 'presenca' deve ser uma de {', '.join(PRESENCAS)} (veio {e['presenca']!r})")
            for campo in ("descricao", "avaliacao", "dicas"):
                if campo in e and not texto_ok(e[campo]):
                    erros.append(f"{rot}: '{campo}' deve ser texto não vazio")

        disc = g.get("disciplinas")
        if not isinstance(disc, dict):
            erros.append(f"{base}.disciplinas: ausente ou não é objeto")
            disc = {}
        for codigo, e in disc.items():
            rot = f"{base}.disciplinas.{codigo}"
            confere_codigo(curso, "guia", codigo, rot)
            entrada_guia(e, rot)
        sc = g.get("semCodigo", {})
        if not isinstance(sc, dict):
            erros.append(f"{base}.semCodigo: deve ser objeto")
            sc = {}
        for nome, e in sc.items():
            rot = f"{base}.semCodigo[{nome!r}]"
            entrada_guia(e, rot)
            achou = por_nome.get((curso, "guia", nome))
            if achou:
                usadas.update(achou)
            sem_codigo.append({"arquivo": "guia", "curso": curso, "nome": nome, "excecao": bool(achou)})
            if not achou:
                erros.append(f"{rot}: entrada sem código e sem exceção justificada")

    for arq in ("horarios", "guia"):
        if not dados[arq]:
            erros.append(f"{ARQUIVOS[arq]}: nenhum 'window.{arq}[N] = ...' encontrado")

    usadas_det = [lista_exc[n] for n in sorted(usadas)]
    sem_uso = [e for n, e in enumerate(lista_exc) if n not in usadas]
    return {"erros": erros, "excecoes_usadas": usadas_det, "excecoes_sem_uso": sem_uso, "sem_codigo": sem_codigo}


def valida_textos(textos, excecoes):
    dados, dups = carrega(textos)
    return valida(dados, dups, excecoes)


# ---------------------------------------------------------------- relatório
def imprime(r, out=sys.stdout):
    p = lambda s="": print(s, file=out)
    p(f"Turmas e entradas sem código ({len(r['sem_codigo'])}):")
    for s in r["sem_codigo"]:
        hs = f" · {', '.join(s['horarios'])}" if isinstance(s.get("horarios"), list) else ""
        par = f" ({s['paridade']})" if s.get("paridade") else ""
        p(f"  - {s['arquivo']}{par}: {s['nome']}{hs} · {'exceção cadastrada' if s['excecao'] else 'SEM EXCEÇÃO'}")
    p(f"Exceções usadas ({len(r['excecoes_usadas'])}):")
    for e in r["excecoes_usadas"]:
        p(f"  - {e.get('codigo') or e.get('nome')} [{', '.join(e['arquivos'])}] efeito: {e['efeito']} · motivo: {e['motivo']} · origem: {e['origem']}")
    if r["excecoes_sem_uso"]:
        p(f"Exceções sem uso ({len(r['excecoes_sem_uso'])}, confira se ainda são necessárias):")
        for e in r["excecoes_sem_uso"]:
            p(f"  - {e.get('codigo') or e.get('nome')} [{', '.join(e.get('arquivos', []))}]")
    p(f"Erros ({len(r['erros'])}):")
    for e in r["erros"]:
        p(f"  - {e}")
    p("RESULTADO: " + ("FALHA" if r["erros"] else "OK"))


def principal(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", help="valida a versão deste commit em vez do diretório de trabalho")
    ap.add_argument("--excecoes", default=str(EXCECOES), help="arquivo JSON de exceções justificadas")
    ap.add_argument("--relatorio", help="grava o relatório em JSON neste caminho")
    args = ap.parse_args(argv)
    textos = {a: le_texto(a, args.ref) for a in ARQUIVOS}
    r = valida_textos(textos, carrega_excecoes(args.excecoes))
    imprime(r)
    if args.relatorio:
        Path(args.relatorio).write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
    return 1 if r["erros"] else 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    raise SystemExit(principal())
