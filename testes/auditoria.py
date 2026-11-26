"""Registra falhas de página e restringe requisições à origem em teste."""

from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import url2pathname


def observa(contexto, url, cenario, eventos, avisos):
    alvo = urlsplit(url)
    local = alvo.scheme == "file"
    raiz = Path(url2pathname(alvo.path)).resolve().parent if local else None
    perfil_opcional = urljoin(url, "perfil/perfil.js") if local else None
    logo_firefox = (
        urljoin(url, "static/logo-gremio-eci.png")
        if contexto.browser.browser_type.name == "firefox" else None
    )

    def permitida(endereco):
        pedido = urlsplit(endereco)
        if pedido.scheme in ("data", "blob", "about"):
            return True
        if (pedido.scheme, pedido.netloc) != (alvo.scheme, alvo.netloc):
            return False
        if not local:
            return True
        try:
            return Path(url2pathname(pedido.path)).resolve().is_relative_to(raiz)
        except (OSError, ValueError):
            return False

    def perfil_local_opcional(endereco):
        return bool(perfil_opcional and endereco == perfil_opcional)

    def anota(msg):
        eventos.append(f"[{cenario}] {msg}")

    def intercepta(rota):
        if permitida(rota.request.url):
            rota.continue_()
        else:
            anota(f"REQUISIÇÃO EXTERNA: {rota.request.url}")
            rota.abort()

    def console(msg):
        if msg.type == "warning":
            avisos.append(f"[{cenario}] console: {msg.text}")
            return
        if msg.type != "error":
            return
        if perfil_local_opcional(msg.location.get("url", "")) and "ERR_FILE_NOT_FOUND" in msg.text:
            return
        if perfil_opcional and msg.text == f"Not allowed to load local resource: {perfil_opcional}":
            return
        anota(f"console: {msg.text}")

    def falha(req):
        # O Firefox pode cancelar a carga do logo ao recarregar ou fechar a página.
        cancelado = req.url == logo_firefox and req.failure == "NS_BINDING_ABORTED"
        if not perfil_local_opcional(req.url) and not cancelado:
            anota(f"falha de recurso: {req.url} ({req.failure})")

    contexto.route("**/*", intercepta)
    contexto.on("console", console)
    contexto.on("weberror", lambda evento: anota(f"erro de página: {evento.error}"))
    contexto.on("requestfailed", falha)
    contexto.on("response", lambda res: res.status >= 400 and anota(f"HTTP {res.status}: {res.url}"))
