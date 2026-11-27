"""Executa a suíte de interface sobre uma cópia pública de um commit."""

import argparse
from contextlib import contextmanager
from functools import partial
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
from threading import Thread


TESTES = Path(__file__).resolve().parent
REPO = TESTES.parent
FIXTURES = TESTES / "fixtures"
MOTORES = ("chromium", "firefox", "webkit")
PUBLICO = ("index.html", "classico.html", "README.md", ".nojekyll", "docs", "js", "static")
SUFIXOS_PUBLICOS = {".html", ".md", ".mmd", ".js", ".mjs", ".css", ".svg", ".png", ".ico",
                    ".map", ".txt", ".ttf", ".otf", ".pfb", ".bcmap", ".wasm", ".ftl", ".json", ".fla"}


def caminho_saida(valor):
    caminho = Path(valor)
    if caminho.drive.startswith("\\\\"):
        raise argparse.ArgumentTypeError("--out não aceita caminhos UNC ou de dispositivo")
    caminho = caminho.resolve()
    if caminho.drive.startswith("\\\\"):
        raise argparse.ArgumentTypeError("--out não aceita caminhos UNC ou de dispositivo")
    if caminho.is_relative_to(REPO):
        raise argparse.ArgumentTypeError("--out deve ficar fora do repositório")
    if caminho.exists():
        raise argparse.ArgumentTypeError("--out deve apontar para um diretório novo")
    return caminho


def git(*args):
    return subprocess.run(["git", "-C", str(REPO), *args], check=True, capture_output=True).stdout


def exporta_site(ref, raiz):
    sha = git("rev-parse", "--verify", "--end-of-options", f"{ref}^{{commit}}").decode().strip()
    arquivos = git("ls-tree", "-r", "-z", sha, "--", *PUBLICO).decode().split("\0")
    nomes = {linha.split("\t", 1)[1] for linha in arquivos if linha}
    for linha in filter(None, arquivos):
        entrada, nome = linha.split("\t", 1)
        caminho = PurePosixPath(nome)
        if nome == ".nojekyll":      # único arquivo oculto publicado: marcador vazio da raiz
            if not entrada.startswith("100644 blob ") or git("cat-file", "-s", entrada.split()[2]).strip() != b"0":
                raise ValueError(f"A cópia pública tem um caminho que exige revisão: {nome}")
            continue
        if (not entrada.startswith(("100644 blob ", "100755 blob "))
                or caminho.suffix.lower() not in SUFIXOS_PUBLICOS
                or any(p.startswith((".", "_")) for p in caminho.parts)
                or caminho.name.lower() == "perfil.js"):
            raise ValueError(f"A cópia pública tem um caminho que exige revisão: {nome}")
    raiz.mkdir(parents=True)
    publico = [c for c in PUBLICO if c != ".nojekyll" or ".nojekyll" in nomes]     # opcional na exportação; a conferência P exige
    arquivo = git("archive", "--format=tar", sha, *publico)
    with tarfile.open(fileobj=io.BytesIO(arquivo)) as copia:
        copia.extractall(raiz, filter="data")
    return sha


class Pages(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_request(self, code="-", size="-"):
        if code == 404:
            self.server.faltando.append(self.path)


class ServidorPages(ThreadingHTTPServer):
    request_queue_size = 128


@contextmanager
def acesso(site, transporte):
    if transporte == "file":
        yield (site / "index.html").as_uri(), None
        return

    handler = partial(Pages, directory=str(site.parent))
    with ServidorPages(("127.0.0.1", 0), handler) as servidor:
        servidor.faltando = []
        thread = Thread(target=servidor.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{servidor.server_port}/grade/", servidor.faltando
        finally:
            servidor.shutdown()
            thread.join()


def gerar_pdfs(destino):
    from pypdf import PdfWriter
    from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

    destino.mkdir(parents=True)
    for fonte in sorted(FIXTURES.glob("*.txt")):
        nome = fonte.stem
        linhas = fonte.read_text(encoding="utf-8").splitlines()
        pdf = PdfWriter()
        pagina = pdf.add_blank_page(595, 842)
        N = NameObject
        fonte = DictionaryObject({
            N("/Type"): N("/Font"), N("/Subtype"): N("/Type1"),
            N("/BaseFont"): N("/Helvetica"), N("/Encoding"): N("/WinAnsiEncoding"),
        })
        pagina[N("/Resources")] = DictionaryObject({N("/Font"): DictionaryObject({N("/F1"): fonte})})
        stream = DecodedStreamObject()
        comandos = [b"BT /F1 10 Tf 40 790 Td"]
        for linha in linhas:
            texto = linha.encode("cp1252").replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
            comandos.append(b"(" + texto + b") Tj 0 -18 Td")
        comandos.append(b"ET")
        stream.set_data(b"\n".join(comandos))
        pagina.replace_contents(stream)
        pdf.write(destino / f"{nome}.pdf")


def identifica_suite():
    arquivos = [*TESTES.glob("*.py"), TESTES / "requirements.txt", *FIXTURES.glob("*.txt"), *FIXTURES.glob("*.json")]
    manifesto = {
        arquivo.relative_to(TESTES).as_posix(): sha256(arquivo.read_bytes()).hexdigest()
        for arquivo in arquivos
    }
    return sha256(json.dumps(manifesto, sort_keys=True).encode()).hexdigest()


def executa(args):
    from playwright.sync_api import sync_playwright
    import fluxos
    import reimportacao

    suite_sha256 = identifica_suite()
    args.out.mkdir(parents=True)
    site = args.out / "site" / "grade"
    sha = exporta_site(args.ref, site)
    fixtures_pdf = args.out / "fixtures-pdf"
    gerar_pdfs(fixtures_pdf)
    with acesso(site, args.transport) as (url, faltando), sync_playwright() as pw:
        with getattr(pw, args.browser).launch(headless=True) as navegador:
            versao = navegador.version
            interface, eventos, avisos = fluxos.rodar(navegador, url, args.out, fixtures_pdf, args.casos)
            if args.casos:      # execução dirigida: só os cenários de interface que casam com o filtro
                reimport, eventos_reimport, avisos_reimport = [], [], []
            else:
                reimport, eventos_reimport, avisos_reimport = reimportacao.rodar(
                    navegador, url, args.out, fixtures_pdf, site, faltando
                )
    resultados = [
        {"cenario": nome, "ok": status == "OK", "detalhe": detalhe}
        for status, nome, detalhe in interface
    ] + reimport
    eventos += eventos_reimport
    esperados = 96 if args.transport == "http" else 95
    if args.casos:
        esperados = len(resultados)     # execução dirigida: não vale como matriz
    relatorio = dict(commit=sha, suite_sha256=suite_sha256, navegador=args.browser,
                     versao=versao, transporte=args.transport, esperados=esperados,
                     resultados=resultados, eventos=eventos, avisos=avisos + avisos_reimport,
                     publicacao_exec=args.transport == "http")
    (args.out / "resultado.json").write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding="utf-8")
    passou = sum(r["ok"] for r in resultados)
    sem_correspondencia = bool(args.casos) and not interface     # --casos que não casa com nada não vale como sucesso
    print(f"{sha[:7]} {args.browser}/{args.transport}: {passou}/{len(resultados)} OK, {len(eventos)} eventos")
    for resultado in resultados:
        if not resultado["ok"]:
            print(f"FALHA: {resultado['cenario']} — {resultado['detalhe'].splitlines()[0] or 'asserção'}")
    if args.transport == "file":
        print("P não se aplica a file:// (ensaio HTTP sob /grade/).")
    if sem_correspondencia:
        print(f"FALHA: --casos {args.casos!r} não casou com nenhum cenário de interface")
    if len(resultados) != esperados:
        print(f"FALHA: esperados {esperados} cenários, executados {len(resultados)}")
    return 0 if passou == len(resultados) == esperados and not eventos and not sem_correspondencia else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", required=True, choices=MOTORES)
    parser.add_argument("--transport", required=True, choices=("file", "http"))
    parser.add_argument("--ref", default="HEAD")
    parser.add_argument("--casos", help="expressão regular: roda só os cenários de interface cujo nome casa (execução dirigida)")
    parser.add_argument("--out", type=caminho_saida, required=True)
    raise SystemExit(executa(parser.parse_args()))
