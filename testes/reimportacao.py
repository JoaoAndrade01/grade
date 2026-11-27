"""Regressões de reimportação e ensaio local de publicação."""
import json, pathlib, re
from auditoria import observa

K = "gradeECI.v2."
HORARIO = "sex 16-17"          # anotação feita à mão no cronograma (célula sexta 16h; não é horário de referência)
CEL = 416                       # sexta (4) * 100 + 16h
COM_HORARIO, COM_STATUS, COM_PINCEL = "COS242", "FIT122", "MAC128"
STATUS = "previsto"             # "aprovação esperada" gravada no item do período atual
PINCEL = "aprovada"             # tag "Cursada" pintada com o pincel

resultados = []
def registra(nome, ok, detalhe="", info=None):
    resultados.append({"cenario": nome, "ok": ok, "detalhe": detalhe, "info": info or {}})
    print(("OK    " if ok else "FALHA ") + nome + (f"\n       {detalhe}" if detalhe else ""))

def abre(b, url, nome, eventos, avisos):
    ctx = b.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True)
    pg = ctx.new_page()
    observa(ctx, url, nome, eventos, avisos)
    pg.goto(url); pg.wait_for_load_state("load")
    # deixa o botão Importar no topo (atalhos fixados); versões sem essa chave simplesmente a ignoram
    pg.evaluate("k => { localStorage.setItem(k + 'atalhos', JSON.stringify(['perfil','importar','tema','privacidade','referencias','tags'])); localStorage.setItem(k + 'modoClassico', 'false'); }", K)
    pg.reload(); pg.wait_for_load_state("load")
    return ctx, pg

def ls(pg, k): return pg.evaluate("k => JSON.parse(localStorage.getItem(k))", K + k)

def perfil_efetivo(pg):
    """O que o app exportaria agora: perfilImportado + edições locais de período (plano.periodos)."""
    p = ls(pg, "perfilImportado") or {"periodos": []}
    plano = ls(pg, "plano") or {}
    for per in p.get("periodos", []):
        if per["nome"] in (plano.get("periodos") or {}): per["disciplinas"] = plano["periodos"][per["nome"]]
    return p

def itens(per): return [d if isinstance(d, dict) else {"code": d} for d in per.get("disciplinas", [])]
def atual_de(p):
    a = [x for x in p.get("periodos", []) if x.get("atual")]
    return a[0] if a else None
def item(per, code): return next((d for d in itens(per) if d["code"] == code), None) if per else None

def fecha_painel(pg):
    if pg.locator("#detalhes").is_visible(): pg.keyboard.press("Escape"); pg.wait_for_timeout(100)

def abre_importador(pg):
    fecha_painel(pg)
    btn = pg.locator("#btn-importar")
    if btn.count() and btn.is_visible(): btn.click()
    else: pg.get_by_role("button", name=re.compile("Importar", re.I)).first.click()
    pg.wait_for_selector("#siga-pdfs", state="attached")

def gera(pg):
    abre_importador(pg)
    pg.set_input_files("#siga-pdfs", [str(p) for p in PDFS]); pg.click("#siga-gerar")
    pg.wait_for_selector("#siga-usar", timeout=30000)
    return pg.input_value("#siga-atual") if pg.locator("#siga-atual").count() else None

def semestre(pg, valor):
    """valor None = mantém o sugerido; "" = sem data; "AAAA/n" = corrigido."""
    if valor is not None: pg.fill("#siga-atual", valor); pg.locator("#siga-atual").press("Tab")
    pg.wait_for_timeout(150)

def baixa_e_usa(pg, pasta, rotulo):
    """Baixa a prévia, depois aplica; devolve (baixado, aplicado) como dicionários."""
    with pg.expect_download(timeout=10000) as d: pg.click("#siga-baixar")
    txt = pathlib.Path(d.value.path()).read_text(encoding="utf-8")
    (pasta / f"{rotulo}-baixado.perfil.js").write_text(txt, encoding="utf-8")
    m = re.search(r"window\.PERFIL\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S)
    assert m, "perfil.js baixado fora do formato window.PERFIL = {...}"
    baixado = json.loads(m.group(1))
    pg.click("#siga-usar"); pg.wait_for_timeout(400)
    aplicado = perfil_efetivo(pg)
    (pasta / f"{rotulo}-aplicado.json").write_text(json.dumps(aplicado, ensure_ascii=False, indent=1), encoding="utf-8")
    return baixado, aplicado

def modo_classico(pg, ligar):
    chk = pg.locator("#modo-classico")
    if chk.count() and chk.is_checked() != ligar: pg.locator("#seletor-modo label:has(input:not(:checked))").click(); pg.wait_for_timeout(150)

def anota(pg, periodo, pasta):
    """Na interface: pinta MAC128 com o pincel e marca um horário de COS242 no cronograma do período atual.
    O status do item FIT122 não tem botão na interface: entra pelo caminho documentado de perfil editado à mão
    (Importar → Escolher perfil.js / .json), com o horário já anotado."""
    fecha_painel(pg)
    modo_classico(pg, True)
    pg.click(f'[data-pincel="{PINCEL}"]'); pg.locator(f'.card[data-code="{COM_PINCEL}"]').first.click()
    modo_classico(pg, False)
    pg.click('[data-vista="cronograma"]')
    pg.click(f'[data-cperiodo="{periodo}"]')
    pg.click(f'[data-csel="{COM_HORARIO}"]')
    pg.click(f'[data-cel="{CEL}"]'); pg.wait_for_timeout(150)
    p = perfil_efetivo(pg)
    assert HORARIO in (item(atual_de(p), COM_HORARIO) or {}).get("horarios", []), f"horário não gravado: {item(atual_de(p), COM_HORARIO)}"
    assert item(atual_de(p), COM_STATUS), f"{COM_STATUS} não está no período atual"
    # reescreve o período atual com itens em objeto (o item pode estar como string)
    a = atual_de(p); a["disciplinas"] = [dict(d, status=STATUS) if d["code"] == COM_STATUS else d for d in itens(a)]
    arq = pasta / "perfil-com-status.json"; arq.write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
    abre_importador(pg); pg.set_input_files("#importar", str(arq)); pg.wait_for_timeout(400)
    p = perfil_efetivo(pg)
    assert item(atual_de(p), COM_STATUS).get("status") == STATUS, "status não entrou pelo perfil editado"
    assert HORARIO in item(atual_de(p), COM_HORARIO).get("horarios", []), "horário se perdeu ao carregar o perfil editado"
    assert (ls(pg, "marcacoes") or {}).get(COM_PINCEL) == PINCEL, f"pincel não gravado: {ls(pg, 'marcacoes')}"
    fecha_painel(pg)

def ui_horario(pg, periodo):
    """Confere na tela: o cronograma do período atual mostra o horário anotado em COS242?"""
    fecha_painel(pg); modo_classico(pg, False)
    pg.click('[data-vista="cronograma"]')
    b = pg.locator(f'[data-cperiodo="{periodo}"]')
    if not b.count(): return f"aba {periodo} ausente no cronograma"
    b.click()
    li = pg.locator(f'li.crono-item:has([data-csel="{COM_HORARIO}"])')
    return li.inner_text() if li.count() else "COS242 ausente na lista"

def tem_horario_em_algum_lugar(p):
    return [per["nome"] for per in p.get("periodos", []) for d in itens(per) if HORARIO in (d.get("horarios") or [])]

# ------------------------------------------------------------------ cenários
CENARIOS = [
    # nome, semestre na 1ª importação, semestre na reimportação, nome esperado do período atual, anotações devem voltar?
    ("A. mantém o semestre sugerido", None, None, "2026/2", True),
    ("B. repete o semestre corrigido (2027/1)", "2027/1", "2027/1", "2027/1", True),
    ("C. repete o período sem data", "", "", "atual", True),
    ("D. controle: anotou em 2026/2 e troca para 2027/1", None, "2027/1", "2027/1", False),
]

def roda_cenario(b, url, base, eventos, avisos, nome, sem1, sem2, esperado, volta):
    pasta = base / ("cenario-" + nome[0]); pasta.mkdir(exist_ok=True)
    ctx, pg = abre(b, url, nome, eventos, avisos)
    info = {}
    try:
        info["sugerido_1"] = gera(pg); semestre(pg, sem1)
        b1, a1 = baixa_e_usa(pg, pasta, "1-importacao")
        per1 = atual_de(a1)["nome"]; info["atual_apos_1"] = per1
        anota(pg, per1, pasta)
        info["sugerido_2"] = gera(pg); semestre(pg, sem2)
        b2, a2 = baixa_e_usa(pg, pasta, "2-reimportacao")
        at = atual_de(a2)
        it_h, it_s = item(at, COM_HORARIO), item(at, COM_STATUS)
        info.update({
            "atual_apos_2": at and at["nome"],
            f"{COM_HORARIO}.horarios": it_h and it_h.get("horarios"),
            f"{COM_STATUS}.status": it_s and it_s.get("status"),
            f"pincel {COM_PINCEL}": (ls(pg, "marcacoes") or {}).get(COM_PINCEL),
            "horario_em_periodos": tem_horario_em_algum_lugar(a2),
            "periodos": [p["nome"] + (" (atual)" if p.get("atual") else "") for p in a2["periodos"]],
            "baixar_igual_aplicar_1": b1 == a1,
            "baixar_igual_aplicar_2": b2 == a2,
            "tela": ui_horario(pg, at["nome"]) if at else None,
        })
        falhas = []
        if not at or at["nome"] != esperado: falhas.append(f"período atual = {at and at['nome']!r}, esperado {esperado!r}")
        if volta:
            if not it_h or HORARIO not in (it_h.get("horarios") or []): falhas.append(f"horário de {COM_HORARIO} perdido ({it_h})")
            if not it_s or it_s.get("status") != STATUS: falhas.append(f"status de {COM_STATUS} perdido ({it_s})")
            if HORARIO not in (info["tela"] or ""): falhas.append("cronograma não mostra o horário")
        else:
            if info["horario_em_periodos"]: falhas.append(f"horário do semestre antigo carregado em {info['horario_em_periodos']}")
            if it_s and it_s.get("status"): falhas.append(f"status do semestre antigo carregado ({it_s})")
            if HORARIO in (info["tela"] or ""): falhas.append("cronograma mostra o horário do semestre antigo")
        if info[f"pincel {COM_PINCEL}"] != PINCEL: falhas.append("marcação do pincel perdida")
        for k in ("baixar_igual_aplicar_1", "baixar_igual_aplicar_2"):
            if not info[k]: falhas.append(f"{k}: perfil baixado ≠ perfil aplicado")
        registra(nome, not falhas, "; ".join(falhas), info)
    except Exception as e:
        registra(nome, False, f"{type(e).__name__}: {e}".splitlines()[0], info)
    finally:
        ctx.close()

def publicacao_local(b, url, site, eventos, avisos, faltando):
    """O que dá para conferir do docs/PUBLICAR.md sem o GitHub Pages real."""
    faltando.clear()
    info, falhas = {}, []
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    inicio = len(eventos)
    observa(ctx, url, "P", eventos, avisos)
    try:
        pg.goto(url); pg.wait_for_load_state("networkidle")
        info["classico_ao_abrir"] = pg.locator("#modo-classico").is_checked()
        info["seletor_e_engrenagem"] = pg.locator("#seletor-modo").is_visible() and pg.locator("#btn-config").is_hidden()   # Clássico: só seletor e tema
        # Referências pelas Configurações (no Planejador)
        modo_classico(pg, False); pg.click("#btn-config"); pg.locator('[data-abrir-atalho="referencias"]').click()
        info["links_referencias"] = pg.locator("#detalhes a").evaluate_all("as => as.map((a) => a.href)")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(100); pg.keyboard.press("Escape")
        # A ECI por trás da Grade sem perfil
        modo_classico(pg, False); pg.click('[data-vista="eci"]')
        info["eci_sem_perfil"] = pg.locator(".eci-lista li").count()
        pg.wait_for_load_state("networkidle")
        info["404"] = sorted(set(faltando)); info["eventos"] = eventos[inicio:]
        if not info["classico_ao_abrir"]: falhas.append("não abre no modo clássico")
        if not info["seletor_e_engrenagem"]: falhas.append("seletor/engrenagem ausentes")
        if info["404"]: falhas.append(f"404 inesperados: {info['404']}")
        if len(info["links_referencias"]) != 4: falhas.append("Referências não contém os quatro links esperados")
        if info["eci_sem_perfil"] < 1: falhas.append("A ECI por trás da Grade vazia sem perfil")
        if info["eventos"]: falhas.append("Erros de navegação na publicação local")
    except Exception as e:
        falhas.append(f"{type(e).__name__}: {e}".splitlines()[0])
    finally:
        ctx.close()
    # Conferências estáticas: caminhos relativos com a mesma caixa (Pages diferencia maiúsculas) e riscos do Jekyll
    arquivos = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file()}
    refs = set()
    for f in ["index.html", "classico.html"] + [a for a in arquivos if a.endswith((".js", ".css")) and "vendor" not in a and ".min." not in a]:
        t = (site / f).read_text(encoding="utf-8", errors="ignore"); d = pathlib.PurePosixPath(f).parent
        for r in re.findall(r'''(?:src|href)\s*=\s*["']([^"'#?]+)["']|url\(\s*["']?([^"')?#]+)|carregaScript\(\s*["']([^"']+)''', t):
            r = next(x for x in r if x)
            if re.match(r"^(https?:|data:|mailto:|javascript:|\$\{|#)", r) or "${" in r: continue
            if r.startswith("/"): refs.add(("ABSOLUTO", f, r)); continue
            alvo = (d / r).as_posix() if f.endswith(".css") else r
            alvo = re.sub(r"(^|/)\./", r"\1", alvo)
            while "/../" in alvo or alvo.startswith("../"): alvo = re.sub(r"[^/]+/\.\./", "", alvo, count=1) if not alvo.startswith("../") else alvo[3:]
            refs.add(("OK" if alvo in arquivos else "FALTA", f, alvo))
    info["refs_absolutas"] = sorted(r for r in refs if r[0] == "ABSOLUTO")
    info["refs_faltando_case_sensitive"] = sorted(r for r in refs if r[0] == "FALTA" and r[2] != "perfil/perfil.js")
    info["arquivos_com_underscore_ou_ponto"] = sorted(a for a in arquivos if any(s.startswith(("_", ".")) for s in a.split("/")) and not a.startswith(".git"))
    info["liquid_em_md_html"] = sorted(a for a in arquivos if a.endswith((".md", ".html")) and re.search(r"\{\{|\{%", (site / a).read_text(encoding="utf-8", errors="ignore")))
    info["tem_.nojekyll"] = ".nojekyll" in arquivos
    info["nojekyll_vazio"] = (site / ".nojekyll").is_file() and (site / ".nojekyll").stat().st_size == 0
    info["link_arquitetura"] = re.findall(r'href="([^"]*ARQUITETURA\.md)"', (site / "index.html").read_text(encoding="utf-8"))
    if not info["nojekyll_vazio"]: falhas.append("falta o .nojekyll vazio na raiz: o Jekyll do Pages converteria os .md")
    if info["link_arquitetura"] != ["https://github.com/JoaoAndrade01/grade/blob/master/docs/ARQUITETURA.md"]:
        falhas.append(f"o link 'arquitetura' do index.html deve apontar ao GitHub: {info['link_arquitetura']}")
    if info["refs_absolutas"]: falhas.append(f"caminhos absolutos quebram sob /grade/: {info['refs_absolutas']}")
    if info["refs_faltando_case_sensitive"]: falhas.append(f"referências que não existem com essa caixa: {info['refs_faltando_case_sensitive']}")
    if info["liquid_em_md_html"] and not info["tem_.nojekyll"]: falhas.append(f"Jekyll pode quebrar o build (Liquid sem .nojekyll): {info['liquid_em_md_html']}")
    registra("P. publicação: verificável localmente sob /grade/", not falhas, "; ".join(falhas), info)


def rodar(navegador, url, pasta, fixtures_pdf, site, faltando):
    global PDFS
    PDFS = [fixtures_pdf / nome for nome in ("historico-ficticio.pdf", "boa-ficticio.pdf")]
    resultados.clear()
    eventos, avisos = [], []
    for cenario in CENARIOS:
        roda_cenario(navegador, url, pasta, eventos, avisos, *cenario)
    if faltando is not None:
        publicacao_local(navegador, url, site, eventos, avisos, faltando)
    return list(resultados), eventos, avisos
