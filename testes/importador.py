"""Importador JS × Python contra oráculos escritos à mão (sem navegador).

Uso: python testes/importador.py
Roda ferramentas/gerar_perfil.py e ferramentas/gerar_perfil_node.js do checkout em
que este arquivo está, sobre os históricos fictícios de `fixtures/*.txt`, e confere
o resultado com `fixtures/oraculos.json`. Também exige igualdade completa entre JS e Python.
O papel de cada histórico segue a mesma escolha nas duas implementações (`--atual`).
"""
import json
import pathlib
import subprocess
import sys

TESTES = pathlib.Path(__file__).resolve().parent
REPO = TESTES.parent
FX = TESTES / "fixtures"
ORACULOS = json.loads((FX / "oraculos.json").read_text(encoding="utf-8"))["cenarios"]


def roda(comando):
    r = subprocess.run(comando, cwd=REPO, capture_output=True, text=True, encoding="utf-8")
    if r.returncode:
        raise SystemExit(f"falha ao rodar {comando[:3]}: {r.stderr[:300]}")
    return json.loads(r.stdout), r.stderr


def roda_sem_checar(comando):
    r = subprocess.run(comando, cwd=REPO, capture_output=True, text=True, encoding="utf-8")
    return r.returncode, r.stdout, r.stderr


def argumentos(cenario):
    args = []
    for nome in cenario["arquivos"]:
        args += ["--historico", str(FX / f"{nome}.txt")]
    if cenario.get("boa"):
        args += ["--boa", str(FX / f"{cenario['boa']}.txt")]
    if cenario["atual"] is not None:
        args += ["--atual", str(FX / f"{cenario['arquivos'][cenario['atual']]}.txt")]
    if cenario.get("mesclar"):
        args += ["--mesclar", str(FX / f"{cenario['mesclar']}.json")]
    return args


def main():
    falhas = []
    for nome, cen in ORACULOS.items():
        args = argumentos(cen)
        if cen.get("duvida"):
            # PC-05 em dúvida e sem --atual: os dois programas param com código de saída diferente de zero,
            # sem gravar perfil e sem trechos do documento na mensagem.
            for origem, cmd in (("python", [sys.executable, "-X", "utf8", "-B", "ferramentas/gerar_perfil.py", "--texto", "--json", "--hoje", "2000-01-01", *args]),
                                ("js", ["node", "ferramentas/gerar_perfil_node.js", "--hoje", "2000-01-01", *args])):
                codigo, saida, erro = roda_sem_checar(cmd)
                msg = "Não consegui decidir qual é o histórico do curso atual. Rode de novo com `--atual <arquivo>`."
                if codigo == 0 or saida.strip() or msg not in erro or any(t in erro for t in ("MAC118", "FICTICIA", "Componente")):
                    falhas.append(f"{nome}/{origem}: esperado parar com a mensagem de dúvida, obtido código {codigo}, saída {saida[:80]!r}, erro {erro[:200]!r}")
            continue
        py, erro_py = roda([sys.executable, "-X", "utf8", "-B", "ferramentas/gerar_perfil.py",
                            "--texto", "--json", "--hoje", "2000-01-01", *args])
        js, _ = roda(["node", "ferramentas/gerar_perfil_node.js", "--hoje", "2000-01-01", *args])
        esperado = {"periodos": cen["periodos"], "historicoAtual": cen["historicoAtual"]}
        for origem, perfil in (("python", py), ("js", js)):
            obtido = {"periodos": perfil["periodos"], "historicoAtual": (perfil.get("fonte") or {}).get("historicoAtual")}
            if obtido != esperado:
                falhas.append(f"{nome}/{origem}: esperado {esperado}, obtido {obtido}")
        if "aprovacoesDeclaradas" in cen:
            # --mesclar preserva as aprovações registradas por você (campo de nível superior do perfil anterior).
            for origem, perfil in (("python", py), ("js", js)):
                if perfil.get("aprovacoesDeclaradas") != cen["aprovacoesDeclaradas"]:
                    falhas.append(f"{nome}/{origem}: aprovacoesDeclaradas esperado {cen['aprovacoesDeclaradas']}, obtido {perfil.get('aprovacoesDeclaradas')}")
        if "boaPerfil" in cen:
            for origem, perfil in (("python", py), ("js", js)):
                if perfil.get("boa") != cen["boaPerfil"]:
                    falhas.append(f"{nome}/{origem}: BOA esperado {cen['boaPerfil']}, obtido {perfil.get('boa')}")
        if py != js:
            falhas.append(f"{nome}: JS e Python diferem")
        if "--atual" in erro_py:
            falhas.append(f"{nome}: mensagem de dúvida inesperada")
    for f in falhas:
        print("FALHA:", f)
    print(f"{len(ORACULOS) - len({x.split(':')[0].split('/')[0] for x in falhas})}/{len(ORACULOS)} cenários OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
