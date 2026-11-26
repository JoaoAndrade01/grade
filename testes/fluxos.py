"""Cenários de interface portados dos três kits de revisão da Grade."""
import json, pathlib, re
from traceback import format_exc
from playwright.sync_api import expect
from auditoria import observa

FX = pathlib.Path(__file__).resolve().parent / "fixtures"
ORACULOS = json.loads((FX / "oraculos.json").read_text(encoding="utf-8"))["cenarios"]
RELOGIO = "2026-11-26T12:00:00"
PERFIL = json.loads((FX / "perfil-ficticio.json").read_text(encoding="utf-8"))
ANTIGO = json.loads((FX / "perfil-antigo.json").read_text(encoding="utf-8"))
ANTIGO_SEM_NOME = json.loads((FX / "perfil-antigo-sem-nome.json").read_text(encoding="utf-8"))
D = {"width": 1440, "height": 900}; C = {"width": 390, "height": 844}
resultados, eventos, avisos = [], [], []
CHAVE = "gradeECI.v2."

def caso(nome):
    def deco(f):
        def run(b):
            try:
                f(b); resultados.append(("OK", nome, ""))
            except Exception as e:
                resultados.append(("FALHA", nome, f"{type(e).__name__}: {e}\n{format_exc()}"))
        run.nome = nome
        return run
    return deco

TODOS_ATALHOS = ["perfil", "importar", "tema", "privacidade", "referencias", "tags"]
def abre(b, vp=D, esquema="light", perfil=None, extra=None, nome="", toque=False, atalhos=True, relogio=None):
    # Os cenários antigos usam os botões do topo: por padrão, fixa todos os atalhos (atalhos=False = primeira visita real).
    if atalhos: extra = {"atalhos": TODOS_ATALHOS, **(extra or {})}
    ctx = b.new_context(viewport=vp, color_scheme=esquema, is_mobile=toque and b.browser_type.name != "firefox", has_touch=toque, accept_downloads=True)
    if relogio: ctx.clock.set_fixed_time(relogio)      # datas que dependem do relógio ficam fixas
    pg = ctx.new_page()
    observa(ctx, URL, nome, eventos, avisos)
    pg.goto(URL); pg.wait_for_load_state("load")
    if perfil is not None or extra:
        pg.evaluate("""([p, extra, K]) => { if (p) localStorage.setItem(K + 'perfilImportado', JSON.stringify(p));
                       for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(K + k, JSON.stringify(v)); }""", [perfil, extra, CHAVE])
        pg.reload(); pg.wait_for_load_state("load")
    return ctx, pg


def foto(pg, nome, full=False): pg.wait_for_timeout(150); pg.screenshot(path=str(OUT / f"{nome}.png"), full_page=full)
def ls(pg, k): return pg.evaluate("k => JSON.parse(localStorage.getItem(k))", CHAVE + k)
def completo(pg, vista=None):
    if pg.locator("#modo-classico").is_checked(): pg.locator(".interruptor").click()
    if vista: pg.click(f'[data-vista="{vista}"]')

# ------------------------------------------------------------------ tema
@caso("Tema: segue o sistema antes da escolha; botão indica a ação; teclado; persiste; vale para controles nativos")
def t_tema(b):
    ctx, pg = abre(b, esquema="light", nome="tema")
    btn = pg.locator("#btn-tema")
    assert pg.evaluate("document.documentElement.dataset.tema") is None
    expect(btn).to_have_attribute("aria-label", "Ativar modo escuro")
    assert pg.evaluate("getComputedStyle(document.documentElement).colorScheme") == "light dark"
    pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(100)
    expect(btn).to_have_attribute("aria-label", "Ativar modo claro")       # acompanha o sistema sem escolha salva
    pg.emulate_media(color_scheme="light")
    expect(btn).to_have_attribute("aria-label", "Ativar modo escuro")
    # teclado: Tab até o botão e Enter
    for _ in range(30):
        pg.keyboard.press("Tab")
        if pg.evaluate("document.activeElement.id") == "btn-tema":
            break
    assert pg.evaluate("document.activeElement.id") == "btn-tema"
    assert pg.evaluate("document.activeElement.matches(':focus-visible')")
    pg.keyboard.press("Enter")
    expect(pg.locator("html")).to_have_attribute("data-tema", "escuro")
    expect(btn).to_have_attribute("aria-label", "Ativar modo claro")
    assert pg.evaluate("getComputedStyle(document.documentElement).colorScheme") == "dark"
    assert pg.evaluate("document.querySelector('meta[name=color-scheme]').content") == "dark"
    assert ls(pg, "tema") == "escuro"
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor"); assert bg == "rgb(15, 18, 24)", bg
    foto(pg, "10-tema-escuro-escolhido-desktop")
    pg.reload(); pg.wait_for_load_state("load")
    assert pg.evaluate("document.documentElement.dataset.tema") == "escuro"
    # sistema muda para claro: a escolha explícita continua valendo (página e controle nativo)
    pg.emulate_media(color_scheme="light"); completo(pg, "optativas")
    cs = pg.evaluate("getComputedStyle(document.querySelector('#busca-opt')).colorScheme")
    assert cs == "dark", cs
    pg.keyboard.press("Escape"); btn.click()
    assert ls(pg, "tema") == "claro" and pg.evaluate("document.documentElement.dataset.tema") == "claro"
    pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(100)
    assert pg.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(246, 247, 249)"   # claro explícito no sistema escuro
    assert pg.evaluate("getComputedStyle(document.querySelector('#busca-opt')).colorScheme") == "light"
    ctx.close()

@caso("Tema: outra aba acompanha a troca (evento storage)")
def t_tema_abas(b):
    ctx, pg = abre(b, nome="tema-abas")
    pg2 = ctx.new_page()
    pg2.goto(URL)
    pg.click("#btn-tema")
    expect(pg2.locator("html")).to_have_attribute("data-tema", "escuro")
    ctx.close()

# ------------------------------------------------------------------ primeira visita
@caso("Primeira visita sem perfil: grade clássica, modo completo acessível, sem nome nem progresso, aba 'Grade ECI'")
def t_sem_perfil(b):
    ctx, pg = abre(b, nome="sem-perfil", atalhos=False)
    assert pg.locator("#modo-classico").is_checked()
    assert pg.title() == "Grade ECI"
    assert pg.evaluate("document.querySelector('link[rel=icon]').getAttribute('href')") == "static/logo-gremio-eci.png"
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI"
    assert pg.locator("#barra-geral").is_hidden() and pg.locator("#progresso").is_hidden()
    assert pg.locator(".col-topo .chip").count() == 0
    assert pg.locator("#btn-importar .rot").is_visible() and pg.locator("#btn-perfil .rot").is_visible()
    expect(pg.get_by_role("button", name="Criar perfil", exact=True)).to_be_visible()
    assert pg.locator("#btn-config").is_visible() and pg.locator("#seletor-modo").is_visible()
    assert pg.locator("#btn-tema, #btn-privacidade, #btn-referencias, #btn-tags").count() == 0     # atalhos começam desafixados
    logo = pg.locator(".logo").evaluate("i => [i.naturalWidth, i.naturalHeight, i.getBoundingClientRect().width, i.getBoundingClientRect().height, i.alt]")
    assert logo[0] == 200 and abs(logo[2] - logo[3]) < 0.5 and logo[4], logo
    pg.locator("#modo-classico").focus(); pg.keyboard.press("Space")
    assert not pg.locator("#modo-classico").is_checked() and pg.locator(".abas").is_visible()
    pg.click('[data-vista="timeline"]'); assert "Criar perfil" in pg.locator(".sem-perfil").inner_text()
    foto(pg, "11-sem-perfil-modo-completo-linha-do-tempo")
    ctx.close()

# ------------------------------------------------------------------ criar perfil
@caso("Criar perfil com campos vazios preserva marcações; editar com nome e semestre; validação e conflito")
def t_criar_perfil(b):
    ctx, pg = abre(b, nome="criar-perfil")
    pg.locator('.card[data-code="COS110"]').click()           # pinta com a tag padrão (Aprovada)
    assert ls(pg, "marcacoes") == {"COS110": "aprovada"}
    # Para verificar retorno de foco, abra pelo teclado: clique não foca botão em todo motor.
    abertura = pg.locator("#btn-perfil")
    abertura.press("Enter")
    dlg = pg.locator("#dlg-perfil")
    expect(dlg).to_be_visible(); assert pg.evaluate("document.activeElement.id") in ("perfil-nome",)
    foto(pg, "12-dialogo-criar-perfil-vazio")
    pg.keyboard.press("Escape"); expect(dlg).to_be_hidden()
    expect(abertura).to_be_focused()
    pg.click("#btn-perfil"); pg.click("#perfil-salvar"); expect(dlg).to_be_hidden()
    p = ls(pg, "perfilImportado"); assert p and p["periodos"] == [] and "nome" not in p, p
    assert p["marcacoes"] == {"COS110": "aprovada"}
    assert pg.locator("#barra-geral").is_visible() and pg.locator("#titulo").inner_text().strip() == "Grade ECI"
    expect(pg.locator("#btn-perfil")).to_have_text("Editar perfil")
    assert "com-tag" in pg.locator('.card[data-code="COS110"]').get_attribute("class")
    # semestre inválido: mensagem, aria-invalid e diálogo continua aberto
    pg.click("#btn-perfil"); pg.fill("#perfil-nome", "João"); pg.fill("#perfil-semestre", "2026/3"); pg.press("#perfil-semestre", "Enter")
    expect(dlg).to_be_visible(); expect(pg.locator("#perfil-semestre")).to_have_attribute("aria-invalid", "true")
    assert "AAAA/1" in pg.locator("#perfil-semestre-msg").inner_text()
    foto(pg, "13-dialogo-perfil-semestre-invalido")
    pg.fill("#perfil-semestre", "2026/2"); pg.press("#perfil-nome", "Enter")   # Enter salva (não cancela)
    expect(dlg).to_be_hidden()
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI — João", pg.locator("#titulo").inner_text()
    assert pg.title() == "Grade ECI"
    p = ls(pg, "perfilImportado"); assert p["nome"] == "João" and p["periodos"][0] == {"nome": "2026/2", "atual": True, "disciplinas": []}, p
    foto(pg, "14-perfil-criado-com-nome-classico")
    ctx.close()

@caso("Criar/editar perfil: semestre que já existe é sinalizado e nada muda")
def t_perfil_conflito(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="perfil-conflito")
    antes = ls(pg, "perfilImportado")
    pg.click("#btn-perfil")
    assert pg.input_value("#perfil-nome") == "Ana" and pg.input_value("#perfil-semestre") == "2026/2"
    pg.fill("#perfil-semestre", "2027/1"); pg.click("#perfil-salvar")
    expect(pg.locator("#dlg-perfil")).to_be_visible()
    assert "2027/1 já existe como período planejado" in pg.locator("#perfil-semestre-msg").inner_text()
    foto(pg, "15-dialogo-perfil-conflito")
    pg.click("#perfil-cancelar"); assert ls(pg, "perfilImportado") == antes
    ctx.close()

@caso("Compatibilidade: perfil antigo com título 'Grade ECI — Fulano' (com e sem campo nome) e carga por arquivo")
def t_compat(b):
    ctx, pg = abre(b, perfil=ANTIGO, nome="compat")
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI — Fulano"; assert pg.title() == "Grade ECI"
    ctx.close()
    ctx, pg = abre(b, perfil=ANTIGO_SEM_NOME, nome="compat2")
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI — Beto"
    ctx.close()
    ctx, pg = abre(b, nome="compat-arquivo")
    conteudo = "window.PERFIL = " + json.dumps(ANTIGO, ensure_ascii=False) + ";\n"
    pg.click("#btn-importar")
    pg.set_input_files("#importar", {
        "name": "perfil-antigo.js",
        "mimeType": "application/javascript",
        "buffer": conteudo.encode("utf-8"),
    })
    expect(pg.locator("#titulo")).to_have_text(re.compile(r"Grade ECI — Fulano"))
    ctx.close()

# ------------------------------------------------------------------ importar do SIGA
def gera(pg, pdfs):
    pg.click("#btn-importar"); pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in pdfs]); pg.click("#siga-gerar")
    pg.wait_for_selector("#siga-usar", timeout=30000)

@caso("SIGA com BOA: período atual sugerido, correção, conflito e semestre sem data; cabeçalhos pessoais descartados")
def t_siga(b):
    ctx, pg = abre(b, nome="siga")
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    assert pg.input_value("#siga-atual") == "2026/2"
    assert "Período atual sugerido" in pg.locator(".periodo-sugerido").inner_text()
    assert "(2026/1)" in pg.locator("#siga-atual-dica").inner_text()
    foto(pg, "16-siga-previa-periodo-sugerido")
    pg.fill("#siga-atual", "2026/1")
    assert pg.locator("#siga-usar").is_disabled(); assert "já existe como período cursado" in pg.locator("#siga-atual-msg").inner_text()
    foto(pg, "17-siga-previa-conflito")
    pg.fill("#siga-atual", "2027/1"); assert not pg.locator("#siga-usar").is_disabled()
    pg.click("#siga-usar")
    p = ls(pg, "perfilImportado"); atual = [x for x in p["periodos"] if x.get("atual")]
    assert atual and atual[0]["nome"] == "2027/1" and [d["code"] for d in atual[0]["disciplinas"]] == ["MAC128", "COS242", "FIT122"], atual
    txt = json.dumps(p, ensure_ascii=False) + pg.content()
    assert "FICTICIA" not in txt and "000.000.000-00" not in txt and "00.000.000-0" not in txt
    assert pg.locator("#barra-geral").is_visible()
    # nova importação deixando o semestre em branco: período atual sem data
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    pg.fill("#siga-atual", ""); pg.click("#siga-usar")
    p = ls(pg, "perfilImportado"); assert [x["nome"] for x in p["periodos"] if x.get("atual")] == ["atual"], p["periodos"]
    ctx.close()

@caso("SIGA sem BOA: sem campo de período atual e importação funciona")
def t_siga_sem_boa(b):
    ctx, pg = abre(b, nome="siga-sem-boa")
    gera(pg, ["historico-ficticio.pdf"])
    assert pg.locator("#siga-atual").count() == 0
    assert "Sem BOA" in pg.locator(".resumo-import").inner_text()
    pg.click("#siga-usar"); p = ls(pg, "perfilImportado")
    assert [x["nome"] for x in p["periodos"]] == ["2025/1", "2025/2", "2026/1"], [x["nome"] for x in p["periodos"]]
    ctx.close()

# ------------------------------------------------------------------ excluir período
@caso("Excluir período: importado e local, confirmação com contagem, persiste, sai da exportação, protege atual, Descartar distinto")
def t_excluir(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="excluir")
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
    abertura = pg.locator("#excluir-periodo")
    abertura.press("Enter")
    dlg = pg.locator("#dlg-confirma")
    expect(dlg).to_be_visible()
    t = pg.locator("#dlg-confirma-titulo").inner_text() + " " + pg.locator("#dlg-confirma-texto").inner_text()
    assert "2027/1" in t and "4 disciplinas sairão do plano" in t, t
    assert pg.evaluate("document.activeElement.textContent.trim()") == "Cancelar"     # ação segura com foco
    foto(pg, "18-confirmar-excluir-periodo")
    pg.keyboard.press("Escape"); expect(dlg).to_be_hidden()
    expect(pg.locator('[data-cperiodo="2027/1"]')).to_have_count(1)
    expect(abertura).to_be_focused()
    pg.click("#excluir-periodo"); pg.click("#dlg-confirma-ok")
    expect(pg.locator('[data-cperiodo="2027/1"]')).to_have_count(0)
    expect(pg.locator('[data-cperiodo="2027/2"]')).to_have_attribute("aria-selected", "true")
    assert pg.evaluate("document.activeElement.dataset.cperiodo") == "2027/2"
    pg.reload(); pg.wait_for_load_state("load")
    assert pg.locator('[data-cperiodo="2027/1"]').count() == 0 and ls(pg, "plano")["removidos"] == ["2027/1"]
    with pg.expect_download() as d: pg.click("#exportar")
    exp = pathlib.Path(d.value.path()).read_text(encoding="utf-8"); assert '"nome":"2027/1"' not in exp and '"nome":"2027/2"' in exp
    # período local novo
    pg.once("dialog", lambda di: di.accept("2028/1")); pg.click("#novo-periodo")
    expect(pg.locator('[data-cperiodo="2028/1"]')).to_have_attribute("aria-selected", "true")
    assert pg.locator("#descartar").count() == 0                     # local: só Excluir
    pg.click("#excluir-periodo"); assert "O período está vazio" in pg.locator("#dlg-confirma-texto").inner_text()
    pg.click("#dlg-confirma-ok"); expect(pg.locator('[data-cperiodo="2028/1"]')).to_have_count(0)
    assert all(n["nome"] != "2028/1" for n in ls(pg, "plano")["novos"])
    # atual protegido
    pg.click('[data-cperiodo="2026/2"]'); assert pg.locator("#excluir-periodo").count() == 0
    # Descartar edições (período do perfil): volta ao conteúdo original
    pg.click('[data-cperiodo="2027/2"]'); pg.fill("#add-code", "COS482"); pg.click("#add-btn")
    expect(pg.locator("#descartar")).to_be_visible(); expect(pg.locator("#excluir-periodo")).to_be_visible()
    foto(pg, "19-cronograma-descartar-e-excluir")
    pg.click("#descartar"); assert "volta ao conteúdo original" in pg.locator("#dlg-confirma-texto").inner_text()
    pg.click("#dlg-confirma-ok")
    expect(pg.locator(".crono-item")).to_have_count(1); assert pg.locator('[data-cperiodo="2027/2"]').count() == 1
    ctx.close()

# ------------------------------------------------------------------ aviso de oferta
@caso("Aviso de oferta: paridade oposta, exceção do ciclo básico, sem referência, período sem formato; texto visível")
def t_oferta(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="oferta")
    av = lambda c, p: pg.evaluate("([c, p]) => window.GradeInterativa.avisoOferta(c, p)", [c, p])
    assert av("COS360", "2027/1")["texto"] == "Pode não ser ofertada neste semestre. A referência só lista turmas em /2. Confira no SIGA."
    assert av("COS360", "2027/2") is None
    assert av("EEL871", "2027/2")["texto"].endswith("só lista turmas em /1. Confira no SIGA.")
    assert av("MAC248", "2027/1") is None and av("IQG112", "2027/2") is None     # exceções do ciclo básico
    assert av("EEWX00", "2027/1")["curto"] == "Sem oferta de referência"
    assert av("COS360", "Verão 2027") is None and av("COS360", "2027/3") is None   # paridade indeterminada
    assert av("COS360", "2027") is None
    assert av("EEL878", "2027/1") is None                                           # mesma paridade
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
    pg.fill("#add-code", "MAC248"); pg.press("#add-code", "Enter")
    itens = pg.locator(".crono-lista").inner_text()
    assert "Pode não ser ofertada neste semestre. A referência só lista turmas em /2. Confira no SIGA." in itens
    assert "Sem oferta de referência" in itens
    mac = pg.locator('.crono-item:has([data-csel="MAC248"])').inner_text(); assert "ofertada" not in mac and "Sem oferta" not in mac
    assert "Pode não ser ofertada" in pg.locator(".lista-plano.atencao").inner_text()
    foto(pg, "20-cronograma-aviso-oferta-desktop")
    pg.click('[data-vista="timeline"]')
    card = pg.locator('.col-planejado .card[data-code="COS360"]').first
    assert "Referência só lista turmas em /2" in card.inner_text()
    card.focus(); pg.keyboard.press("Enter")                      # teclado abre detalhes com o texto completo
    assert "2027/1: Pode não ser ofertada neste semestre" in pg.locator("#detalhes").inner_text()
    foto(pg, "21-linha-do-tempo-aviso-oferta-detalhes")
    ctx.close()
    ctx, pg = abre(b, vp=C, perfil=PERFIL, nome="oferta-celular", toque=True)
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
    item = pg.locator('.crono-item:has([data-csel="COS360"]) .aviso-oferta'); expect(item).to_be_visible()
    item.scroll_into_view_if_needed(); foto(pg, "22-cronograma-aviso-oferta-celular")
    pg.click('[data-vista="timeline"]'); pg.locator('.col-planejado .card[data-code="COS360"]').first.tap()
    assert "Pode não ser ofertada" in pg.locator("#detalhes").inner_text()
    foto(pg, "23-celular-toque-detalhes-aviso")
    ctx.close()

# ------------------------------------------------------------------ MAC118 / MAC128
@caso("MAC118 prevista no atual: MAC128 mantém aviso no atual e fica elegível no período seguinte")
def t_mac(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="mac")
    a = lambda c, p: pg.evaluate("([c, p]) => window.GradeInterativa.avisos(c, p)", [c, p])
    assert a("MAC128", "2026/2") == ["Requisito MAC118 não cumprido antes deste período"], a("MAC128", "2026/2")
    assert a("MAC128", "2027/1") == [] and a("MAC128", "2027/2") == []
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2026/2"]')
    assert "Requisito MAC118 não cumprido" in pg.locator('.crono-item:has([data-csel="MAC128"])').inner_text()
    pg.once("dialog", lambda d: d.accept()); pg.click('[data-cremove="MAC128"]')   # tira do atual
    pg.click('[data-cperiodo="2027/2"]')
    assert "MAC128" in pg.locator(".lista-sug").inner_text()                   # sugerida (oferta /2)
    pg.click('[data-cperiodo="2027/1"]'); pg.fill("#add-code", "MAC128"); pg.press("#add-code", "Enter")
    it = pg.locator('.crono-item:has([data-csel="MAC128"])').inner_text()
    assert "Requisito" not in it and "ofertada" not in it, it
    ctx.close()

@caso("CR-01: pré-requisito na linha do tempo depende do semestre")
def t_cr01_pre(b):
    alvo = {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238"]}
    historico = {"nome": "2025/1", "disciplinas": ["MAC118"]}
    posterior = {"nome": "2028/1", "atual": True, "disciplinas": [{"code": "MAC128", "status": "previsto"}]}
    anterior = {"nome": "2026/2", "planejado": True, "disciplinas": ["MAC128"]}
    mesmo = {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC128", "MAC238"]}
    sem_data = {"nome": "atual", "atual": True, "disciplinas": ["MAC128"]}
    observado = {}
    for nome, periodos, codigo, requisito in [
        ("posterior-permutado", [posterior, alvo], "MAC238", "MAC128"),
        ("posterior-natural", [alvo, posterior], "MAC238", "MAC128"),
        ("anterior-permutado", [alvo, anterior], "MAC238", "MAC128"),
        ("mesmo-semestre", [mesmo], "MAC238", "MAC128"),
        ("origem-sem-data", [sem_data, alvo], "MAC238", "MAC128"),
        ("alvo-sem-data", [sem_data], "MAC128", "MAC118"),
    ]:
        ctx, pg = abre(b, perfil={"periodos": [historico, *periodos]}, nome=f"cr01-pre-{nome}")
        completo(pg, "timeline")
        titulo = pg.locator(f'.card[data-code="{codigo}"]').get_attribute("title")
        observado[nome] = f"Requisito {requisito} não cumprido" in titulo
        ctx.close()
    assert observado == {
        "posterior-permutado": True, "posterior-natural": True, "anterior-permutado": False,
        "mesmo-semestre": True, "origem-sem-data": True, "alvo-sem-data": True,
    }, observado

@caso("CR-01: co-requisito aceita o mesmo semestre e rejeita semestre posterior")
def t_cr01_co(b):
    observado = {}
    for junto in (True, False):
        for inverter in (False, True):
            base = {"nome": "2026/1", "disciplinas": ["EEL670"]}
            alvo = {"nome": "2027/2", "planejado": True, "disciplinas": ["EEL418"]}
            if junto:
                alvo["disciplinas"].append("COS231")
                periodos = [base, alvo]
            else:
                periodos = [base, alvo, {"nome": "2028/1", "planejado": True, "disciplinas": ["COS231"]}]
            if inverter:
                periodos.reverse()
            ctx, pg = abre(b, perfil={"periodos": periodos}, nome=f"cr01-co-{junto}-{inverter}")
            completo(pg, "timeline")
            titulo = pg.locator('.card[data-code="EEL418"]').get_attribute("title")
            observado[junto, inverter] = "Co-requisito COS231 não cumprido" in titulo
            ctx.close()
    assert observado == {(True, False): False, (True, True): False, (False, False): True, (False, True): True}, observado

@caso("CR-01: sugestões só incluem MAC238 quando o pré-requisito vem antes")
def t_cr01_sugestoes(b):
    observado = {}
    for nome, semestre, inverter in [
        ("posterior-permutado", "2028/1", True),
        ("posterior-natural", "2028/1", False),
        ("anterior-natural", "2026/1", False),
        ("anterior-permutado", "2026/1", True),
    ]:
        fonte = {"nome": semestre, "disciplinas": ["MAC128"]}
        if nome.startswith("posterior"):
            fonte.update(atual=True, disciplinas=[{"code": "MAC128", "status": "previsto"}])
        alvo = {"nome": "2027/1", "planejado": True, "disciplinas": []}
        periodos = [{"nome": "2025/1", "disciplinas": ["MAC118"]}, *sorted([fonte, alvo], key=lambda p: p["nome"], reverse=inverter)]
        ctx, pg = abre(b, perfil={"periodos": periodos}, nome=f"cr01-sug-{nome}")
        completo(pg, "cronograma")
        pg.click('[data-cperiodo="2027/1"]')
        sugestao = pg.locator('.lista-sug [data-sugadd="MAC238"]')
        observado[nome] = sugestao.count() == 1
        if observado[nome]:
            expect(sugestao.locator("xpath=ancestor::li")).to_have_class("cabe")
        ctx.close()
    assert observado == {
        "posterior-permutado": False, "posterior-natural": False,
        "anterior-natural": True, "anterior-permutado": True,
    }, observado

@caso("CR-01: a proposta coloca disciplinas sem horário no último semestre planejado")
def t_cr01_proposta(b):
    ctx, pg = abre(b, perfil={"periodos": [
        {"nome": "2028/1", "planejado": True, "disciplinas": []},
        {"nome": "2027/1", "planejado": True, "disciplinas": []},
    ]}, nome="cr01-proposta")
    completo(pg, "cronograma")
    observado = {}
    for semestre in ("2027/1", "2028/1"):
        pg.click(f'[data-cperiodo="{semestre}"]')
        pg.click("#prop-gerar")
        observado[semestre] = "EEWX00" in pg.locator(".proposta ul").inner_text()
    ctx.close()
    assert observado == {"2027/1": False, "2028/1": True}, observado

@caso("CR-01: a equivalência deferida usa a data da última disciplina de origem")
def t_cr01_equivalencia(b):
    alvo = {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238"]}
    cedo = {"nome": "2026/1", "disciplinas": ["MAC118"]}
    observado = {}
    for semestre in ("2026/2", "2028/1", "atual"):
        outra = {"nome": semestre, "disciplinas": ["FIT112"]}
        ctx, pg = abre(b, perfil={
            "periodos": [outra, cedo, alvo],
            "equivalencias": [{"cursadas": ["MAC118", "FIT112"], "pedida": "MAC128", "status": "deferido"}],
        }, nome=f"cr01-eq-{semestre}")
        completo(pg, "timeline")
        titulo = pg.locator('.card[data-code="MAC238"]').get_attribute("title")
        observado[semestre] = "Requisito MAC128 não cumprido" in titulo
        ctx.close()
    assert observado == {"2026/2": False, "2028/1": True, "atual": True}, observado

@caso("PC-02/03: aprovação pelo pincel conta crédito e identifica a simulação")
def t_cr01_manual(b):
    perfil = {"periodos": [
        {"nome": "2025/1", "disciplinas": ["MAC118", {"code": "FIS111", "nota": "T"}]},
        {"nome": "2025/2", "disciplinas": [{"code": "FIT112", "status": "reprovado"}]},
    ]}
    ctx, pg = abre(b, perfil=perfil, extra={"marcacoes": {"FIT112": "aprovada"}}, nome="cr01-manual-credito")
    assert pg.evaluate("GradeInterativa.totais()[1].ok") == 11
    completo(pg, "grade")
    pg.locator('.card[data-code="FIT112"]').click()
    expect(pg.locator("#detalhes .det-status")).to_contain_text("marcação manual (pincel)")
    pg.keyboard.press("Escape")
    pg.click("#bg-detalhes")
    legenda = pg.locator("#legenda").inner_text() if pg.locator("#legenda").is_visible() else ""
    ctx.close()

    ctx, pg = abre(b, perfil={"periodos": [{"nome": "2027/1", "planejado": True, "disciplinas": ["MAC128"]}]},
                   extra={"marcacoes": {"MAC118": "aprovada"}}, nome="cr01-manual-requisito")
    completo(pg, "timeline")
    mac128 = pg.locator('.card[data-code="MAC128"]')
    assert "Requisito MAC118 não cumprido" not in mac128.get_attribute("title")
    mac128.click()
    requisito = pg.locator('#detalhes li:has([data-ir="MAC118"])').inner_text()
    ctx.close()
    assert "marcação manual" in legenda and "marcação manual" in requisito, (legenda, requisito)

# ------------------------------------------------------------------ extensão
def horas_ace(pg):
    return pg.evaluate("() => { const t = GradeInterativa.totais()[5]; return [t.ok, t.aConfirmar ?? 0, t.plan]; }")

@caso("CR-03: horas de ACE no histórico e na extensão respeitam a identidade por período")
def t_cr03_historico(b):
    observado, pg_barra = {}, {}
    for nome, periodos, periodo_ext in [
        ("mesmo-periodo", ["2026/1"], "2026/1"),
        ("periodos-distintos", ["2025/2"], "2026/1"),
        ("sem-periodo", ["2026/1"], ""),
        ("dois-periodos-e-data-incerta", ["2025/2", "2026/1"], ""),
    ]:
        perfil = {
            "periodos": [{"nome": p, "disciplinas": ["EEW002"]} for p in periodos],
            "extensao": [{"code": "EEW002", "horas": 30, "periodo": periodo_ext, "status": "validada"}],
        }
        ctx, pg = abre(b, perfil=perfil, nome=f"cr03-historico-{nome}")
        completo(pg, "grade")
        bloco = pg.locator(".card.bloco.cat-5 .meta").inner_text()
        pg.click("#bg-detalhes")
        progresso = pg.locator("#progresso .cat-5")
        largura = progresso.locator(".b-ok").evaluate("el => parseFloat(el.style.width)")
        pg.click('[data-vista="pedidos"]')
        pg_barra[nome] = pg.locator("#barra-geral .bg-total").inner_text()
        observado[nome] = (horas_ace(pg), bloco, pg.locator(".ace-duplicidade").count(), largura)
        ctx.close()
    esperados = {
        "mesmo-periodo": (30, 30), "periodos-distintos": (60, 0),
        "sem-periodo": (30, 30), "dois-periodos-e-data-incerta": (60, 30),
    }
    for nome, (confirmadas, pendentes) in esperados.items():
        horas, bloco, avisos_ace, largura = observado[nome]
        assert horas == [confirmadas, pendentes, 0], observado
        assert bloco == f"{confirmadas} / 405 h" + (f" · +{pendentes} h a confirmar" if pendentes else ""), observado     # B1.6: mesmo resumo de ACE
        assert ("a confirmar" in pg_barra[nome]) == bool(pendentes), (nome, pg_barra[nome])
        assert avisos_ace == int(bool(pendentes)), observado
        assert abs(largura - confirmadas / 405 * 100) < 0.01, observado

@caso("CR-03: duas entradas no mesmo período confirmam o maior valor e separam as demais horas")
def t_cr03_lista(b):
    perfil = {"periodos": [], "extensao": [
        {"code": "EEW002", "horas": 20, "periodo": "2026/1", "status": "validada"},
        {"code": "EEW002", "horas": 30, "periodo": "2026/1", "status": "validada"},
        {"code": "EEW002", "horas": 15, "periodo": "2026/1", "status": "planejada"},
        {"nome": "Atividade livre fictícia", "horas": 5, "status": "validada"},
    ]}
    ctx, pg = abre(b, perfil=perfil, nome="cr03-lista")
    completo(pg, "pedidos")
    observado = horas_ace(pg)
    assert observado == [35, 20, 15], observado
    expect(pg.locator(".ace-duplicidade")).to_contain_text("Possível duplicidade")
    expect(pg.locator(".ace-duplicidade")).to_contain_text("20 h a confirmar")
    expect(pg.locator(".ace-duplicidade")).to_contain_text("EEW002")
    ctx.close()

# ------------------------------------------------------------------ CR-04: histórico do curso atual
PEDIDO_MAC118 = {"periodos": [], "equivalencias": [{"cursadas": ["MAC118"], "pedida": "COC602", "status": "a pedir"}]}

def disciplinas_de(p):
    return [{"nome": x["nome"], "disciplinas": [d if isinstance(d, dict) else {"code": d} for d in x["disciplinas"]]} for x in p["periodos"]]

def confere_oraculo(p, cenario):
    esperado = ORACULOS[cenario]
    obtido = disciplinas_de(p)
    assert obtido == esperado["periodos"], (cenario, obtido)
    assert (p.get("fonte") or {}).get("historicoAtual") == esperado["historicoAtual"], (cenario, p.get("fonte"))

def importa_cenario(b, cenario, nome, escolha=None, extra=None):
    """Importa os PDFs fictícios do cenário sobre um perfil com um pedido de MAC118; devolve (ctx, pg)."""
    ctx, pg = abre(b, perfil=PEDIDO_MAC118, nome=nome, relogio=RELOGIO, extra=extra)
    gera(pg, [f"{n}.pdf" for n in ORACULOS[cenario]["arquivos"]])
    if escolha is not None:
        pg.locator(f'input[name="siga-papel"][value="{escolha}"]').check()
    return ctx, pg

def aplica_e_le_pedido(pg):
    pg.click("#siga-usar")
    perfil = ls(pg, "perfilImportado")
    completo(pg, "pedidos")
    return perfil, pg.locator('.pedidos tr[class^="eq-"]').first.inner_text()

@caso("CR-04: o ano do bloco do histórico atual rege o prazo e a data original só informa, nas duas ordens")
def t_cr04_reingresso(b):
    for cenario in ("reingresso-antigo-atual", "reingresso-atual-antigo"):
        ctx, pg = importa_cenario(b, cenario, f"cr04-{cenario}")
        atual = 1 if cenario == "reingresso-antigo-atual" else 0
        assert pg.locator('input[name="siga-papel"]').count() == 2
        assert pg.locator(f'input[name="siga-papel"][value="{atual}"]').is_checked(), cenario
        assert pg.locator(".papel-historico .alerta").count() == 0
        perfil, linha = aplica_e_le_pedido(pg)
        confere_oraculo(perfil, cenario)
        assert "mais de 5 anos" not in linha and "não confirmada" not in linha, linha
        assert "2025" in linha and "2020/1" in linha, linha
        ctx.close()

@caso("CR-04: só o atual, só o anterior e marcador AAAA/0 (controles)")
def t_cr04_controles(b):
    ctx, pg = importa_cenario(b, "so-atual", "cr04-so-atual")
    assert pg.locator('input[name="siga-papel"]').count() == 0      # um só histórico: nada a escolher
    perfil, linha = aplica_e_le_pedido(pg)
    confere_oraculo(perfil, "so-atual")
    assert "mais de 5 anos" not in linha and "não confirmada" not in linha and "2025" in linha, linha
    assert "2020/1" not in linha, linha                               # origem ausente
    ctx.close()
    ctx, pg = importa_cenario(b, "so-antigo", "cr04-so-antigo")
    perfil, linha = aplica_e_le_pedido(pg)
    confere_oraculo(perfil, "so-antigo")
    assert "6.5 anos" in linha and "pode exigir exame de suficiência" in linha, linha    # idade pelo semestre 2020/1
    ctx.close()
    ctx, pg = importa_cenario(b, "zero", "cr04-zero")
    perfil, linha = aplica_e_le_pedido(pg)
    confere_oraculo(perfil, "zero")                                   # 2024/0 não vira semestre real
    assert all(x["nome"] != "2024/1" and x["nome"] != "2024/2" for x in perfil["periodos"])
    ctx.close()

@caso("CR-04/PC-05: papel do histórico automático, em dúvida e por escolha explícita; baixar e aplicar coincidem")
def t_cr04_papel(b):
    ctx, pg = importa_cenario(b, "papel-automatico", "cr04-papel-auto")
    assert pg.locator('input[name="siga-papel"][value="0"]').is_checked() and pg.locator(".papel-historico .alerta").count() == 0
    perfil, _ = aplica_e_le_pedido(pg); confere_oraculo(perfil, "papel-automatico")
    ctx.close()

    ctx, pg = importa_cenario(b, "papel-duvida", "cr04-papel-duvida")
    assert pg.locator('input[name="siga-papel"]:checked').count() == 0
    expect(pg.locator(".papel-historico .alerta")).to_contain_text("escolha", ignore_case=True)
    perfil, linha = aplica_e_le_pedido(pg)                            # sem escolher: aplica, com a idade como estimativa
    confere_oraculo(perfil, "papel-duvida")
    assert "estimativa" in linha.lower(), linha
    ctx.close()

    for cenario, indice in (("papel-escolha-bloco", 0), ("papel-escolha-anterior", 1)):
        ctx, pg = importa_cenario(b, cenario, f"cr04-{cenario}", escolha=indice)
        assert pg.locator(".papel-historico .alerta").count() == 0
        with pg.expect_download(timeout=10000) as d: pg.click("#siga-baixar")
        txt = pathlib.Path(d.value.path()).read_text(encoding="utf-8")
        baixado = json.loads(re.search(r"window\.PERFIL\s*=\s*(\{.*\})\s*;?\s*$", txt, re.S).group(1))
        perfil, _ = aplica_e_le_pedido(pg)
        assert baixado == perfil, "baixar e aplicar divergem com a mesma escolha"
        confere_oraculo(perfil, cenario)
        ctx.close()

@caso("CR-04/PC-06: fronteira de 5 anos com só o ano do bloco")
def t_cr04_fronteira(b):
    for ano, alerta, precisao in ((2022, False, False), (2021, False, True), (2020, True, False)):
        ctx, pg = importa_cenario(b, f"fronteira-{ano}", f"cr04-fronteira-{ano}")
        perfil, linha = aplica_e_le_pedido(pg)
        confere_oraculo(perfil, f"fronteira-{ano}")
        assert ("mais de 5 anos" in linha) == alerta, (ano, linha)
        assert ("só o ano é conhecido; pode passar de 5 anos" in linha) == precisao, (ano, linha)
        assert not any(x["nome"].startswith(f"{ano}/") for x in perfil["periodos"]), perfil["periodos"]   # sem inventar semestre
        ctx.close()

# ------------------------------------------------------------------ CR-02: origem em dispensas (D-07)
def creditos_por_grupo(pg):
    return pg.evaluate("() => { const t = GradeInterativa.totais(); return Object.fromEntries([1, 2, 3, 4].map((k) => [k, t[k].ok])); }")

XYZ101 = {"code": "XYZ101", "name": "Origem fictícia", "credits": 4, "category": 3}
ABC123 = {"code": "ABC123", "name": "Livre fictícia", "credits": 4, "category": 3}
def pedido_deferido(origem, pedida): return {"cursadas": [origem], "pedida": pedida, "status": "deferido"}

@caso("CR-02: origem em dois pedidos deferidos (04a) e em pedido e dispensa (04b)")
def t_cr02_pedidos(b):
    ctx, pg = abre(b, perfil={"periodos": [{"nome": "2025/1", "disciplinas": [dict(ABC123)]}],
                              "equivalencias": [pedido_deferido("ABC123", "COP232"), pedido_deferido("ABC123", "COP364")]}, nome="cr02-04a")
    completo(pg, "pedidos")
    assert creditos_por_grupo(pg) == {"1": 0, "2": 0, "3": 4, "4": 0}, creditos_por_grupo(pg)     # COP232 e COP364 não contam
    linhas = pg.locator('.pedidos tr[class^="eq-"]')
    assert linhas.count() == 2
    for i in range(2):
        texto = linhas.nth(i).inner_text()
        assert "já usada em outro pedido/dispensa" in texto and "Créditos fora da soma" in texto, texto
    ctx.close()

    base = {"periodos": [{"nome": "2024/1", "disciplinas": [dict(XYZ101, dispensa=["FIS111"])]}]}
    for nome, pedidos in (("sem-pedido", []), ("com-pedido", [pedido_deferido("XYZ101", "COP232")])):
        ctx, pg = abre(b, perfil=dict(base, equivalencias=pedidos), nome=f"cr02-04b-{nome}")
        completo(pg, "pedidos")
        assert creditos_por_grupo(pg) == {"1": 1, "2": 0, "3": 0, "4": 0}, (nome, creditos_por_grupo(pg))   # FIS111 1 cr; origem 0 cr
        assert pg.locator(".aviso-dispensa").count() == 0
        if pedidos:
            texto = pg.locator('.pedidos tr[class^="eq-"]').first.inner_text()
            assert "já usada em outro pedido/dispensa" in texto and "Créditos fora da soma" in texto, texto
        ctx.close()

def exporta_e_reimporta(b, pg, perfil, nome):
    """O registro histórico fica como entrou; reimportar o exportado repete os totais."""
    exportado = pg.evaluate("() => GradeInterativa.perfilExportado()")
    assert exportado["periodos"] == perfil["periodos"], exportado["periodos"]
    antes = creditos_por_grupo(pg)
    ctx2, pg2 = abre(b, perfil=exportado, nome=nome)
    assert creditos_por_grupo(pg2) == antes
    ctx2.close()

@caso("CR-02: duas dispensas pela mesma origem contam os alvos, não a origem, e avisam (04c)")
def t_cr02_duas_dispensas(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": [{"code": "MAC118", "dispensa": ["MAC128", "COS242"]}]}]}
    ctx, pg = abre(b, perfil=perfil, nome="cr02-04c")
    completo(pg, "pedidos")
    assert creditos_por_grupo(pg) == {"1": 8, "2": 0, "3": 0, "4": 0}, creditos_por_grupo(pg)      # 0 + 4 + 4, não 6 + 4 + 4
    aviso = pg.locator(".aviso-dispensa")
    expect(aviso).to_have_count(1)
    expect(aviso).to_contain_text("MAC118"); expect(aviso).to_contain_text("art. 46, II")
    completo(pg, "timeline")
    pg.locator('.card[data-code="MAC118"]').click()
    expect(pg.locator("#detalhes .aviso-dispensa")).to_contain_text("art. 46, II")
    exporta_e_reimporta(b, pg, perfil, "cr02-04c-reimporta")
    ctx.close()

@caso("CR-02: dispensa única conta o alvo e não a origem, sem aviso de reutilização (04d)")
def t_cr02_dispensa_unica(b):
    perfil = {"periodos": [{"nome": "2024/1", "disciplinas": [dict(XYZ101, dispensa=["FIS111"])]}]}
    ctx, pg = abre(b, perfil=perfil, nome="cr02-04d")
    completo(pg, "pedidos")
    assert creditos_por_grupo(pg) == {"1": 1, "2": 0, "3": 0, "4": 0}, creditos_por_grupo(pg)      # FIS111 1 cr; XYZ101 0 cr
    assert pg.locator(".aviso-dispensa").count() == 0
    # a grade (classe de livre escolha) também não preenche blocos com a origem
    completo(pg, "grade")
    pg.click("#bg-detalhes")
    largura = pg.locator("#progresso .cat-3 .b-ok").evaluate("el => parseFloat(el.style.width)")
    assert largura == 0, largura
    exporta_e_reimporta(b, pg, perfil, "cr02-04d-reimporta")
    ctx.close()

# ------------------------------------------------------------------ D-02 / PC-04: dois números na livre escolha
DEF456 = {"code": "DEF456", "name": "Livre fictícia B", "credits": 2, "category": 3}
BOA_P5 = {"emissao": "20/11/2026", "naoExplicitadasPresente": True, "naoExplicitadas": [
    {"code": "ABC123", "name": "Livre fictícia A", "credits": 4, "ch": 60, "grau": "7.0"},
    {"code": "DEF456", "name": "Livre fictícia B", "credits": 2, "ch": 30, "grau": "8.0"}]}

def p5(boa="padrao", cursando=False, categoria=3, periodo_sem_data=False):
    """Perfil base P5: ABC123 (4 cr) e DEF456 (2 cr) de livre escolha; pedido deferido de COP232 com ABC123 como conteúdo."""
    abc = dict(ABC123, category=categoria)
    periodos = [{"nome": "2025/1", "disciplinas": [DEF456] if cursando else [abc, dict(DEF456)]}]
    if cursando: periodos.append({"nome": "2026/2", "atual": True, "disciplinas": [abc]})
    if periodo_sem_data: periodos = [{"nome": "Histórico sem data", "disciplinas": [abc, dict(DEF456)]}]
    perfil = {"periodos": periodos, "equivalencias": [{"cursadas": [{"code": "ABC123", "papel": "conteudo"}], "pedida": "COP232", "status": "deferido"}]}
    if boa == "padrao": boa = BOA_P5
    if boa is not None: perfil["boa"] = boa
    return perfil

def numeros_livre(pg):
    """Textos dos dois números, nos Pedidos e no progresso detalhado da Grade."""
    completo(pg, "pedidos")
    pedidos = pg.locator(".pedidos .livre-numeros li").all_inner_texts()
    completo(pg, "grade")
    if pg.locator("#progresso").is_hidden(): pg.click("#bg-detalhes")
    progresso = pg.locator("#progresso .cat-3 .livre-numeros li").all_inner_texts()
    assert pedidos == progresso, (pedidos, progresso)
    assert len(pedidos) == 2, pedidos
    assert not re.search(r"total do boa", " ".join(pedidos), re.I), pedidos
    return pedidos

@caso("D-02/PC-04: dois números rotulados na livre escolha (05a, 05b, 05g)")
def t_d02_dois_numeros(b):
    ctx, pg = abre(b, perfil=p5(), nome="d02-05a")
    grade, boa = numeros_livre(pg)
    assert "Grade: 2 cr" in grade and "estimativa" in grade, grade
    assert "BOA, soma das não explicitadas: 6 cr" in boa and "20/11/2026" in boa and "estimativa" in boa, boa
    assert pg.evaluate("() => { const t = GradeInterativa.totais(); return [t[1].ok, t[3].ok]; }") == [4, 2]   # COP232 conta 4 cr nas obrigatórias
    ctx.close()
    ctx, pg = abre(b, perfil=p5(cursando=True), nome="d02-05b")
    grade, boa = numeros_livre(pg)
    assert "Grade: 2 cr" in grade, grade
    assert pg.evaluate("() => { const t = GradeInterativa.totais(); return [t[1].ok, t[1].prev]; }") == [0, 4]     # COP232 prevista
    ctx.close()
    # a linha de total do BOA (4 cr na fixture boa-p5-total-4) nunca vira o número: ver testes/importador.py
    ctx, pg = abre(b, perfil=p5(dict(BOA_P5, emissao=None)), nome="d02-05a-sem-emissao")
    assert "BOA, soma das não explicitadas: 6 cr" in numeros_livre(pg)[1]
    ctx.close()

@caso("D-02/PC-04: BOA ausente, seção ausente e seção vazia (05c, 05d, 05h) e perfil antigo sem o indicador")
def t_d02_ausente_e_vazia(b):
    casos = [
        ("05c-sem-boa", p5(boa=None), "BOA: indisponível", "nenhum BOA importado"),
        ("05d-sem-secao", p5(boa={"emissao": "20/11/2026", "naoExplicitadasPresente": False, "naoExplicitadas": []}),
         "BOA: indisponível", "Cursadas e Não Explicitadas"),
        ("05h-secao-vazia", p5(boa={"emissao": "20/11/2026", "naoExplicitadasPresente": True, "naoExplicitadas": []}),
         "BOA, soma das não explicitadas: 0 cr", None),
        ("antigo-com-linhas", p5(boa={"emissao": "20/11/2026", "naoExplicitadas": BOA_P5["naoExplicitadas"]}),
         "BOA, soma das não explicitadas: 6 cr", None),            # sem indicador, mas as linhas provam a seção
        ("antigo-sem-linhas", p5(boa={"emissao": "20/11/2026", "naoExplicitadas": []}),
         "BOA: indisponível", "Cursadas e Não Explicitadas"),     # sem indicador e sem linhas: não prova a seção
    ]
    for nome, perfil, esperado, motivo in casos:
        ctx, pg = abre(b, perfil=perfil, nome=f"d02-{nome}")
        grade, boa = numeros_livre(pg)
        assert "Grade: 2 cr" in grade, (nome, grade)
        assert esperado in boa, (nome, boa)
        if motivo: assert motivo in boa, (nome, boa)
        if esperado.startswith("BOA: indisp"): assert " cr" not in boa.split("indisponível")[0] and "soma" not in boa, (nome, boa)
        ctx.close()

@caso("D-02: condicionada fora da livre escolha (05e) e aprovada em período sem data (05f)")
def t_d02_outros_grupos(b):
    ctx, pg = abre(b, perfil=p5(categoria=2), nome="d02-05e")
    completo(pg, "pedidos")
    assert pg.evaluate("() => { const t = GradeInterativa.totais(); return [t[1].ok, t[2].ok, t[3].ok]; }") == [4, 0, 2]   # ABC123 saiu do grupo 2
    assert "BOA" not in pg.locator(".contas tbody tr").nth(0).inner_text()                  # sem nota sobre o BOA no grupo 2
    ctx.close()
    ctx, pg = abre(b, perfil=p5(periodo_sem_data=True), nome="d02-05f")
    completo(pg, "grade")
    pg.locator('.painel .card[data-code="COP232"]').click()
    expect(pg.locator("#detalhes")).to_contain_text("Período não confirmado")
    assert pg.evaluate("() => GradeInterativa.totais()[1].ok") == 4
    ctx.close()

@caso("D-02/PC-04: importar BOA com seção vazia ou ausente grava o indicador de presença")
def t_d02_importacao(b):
    for pdf, esperado, texto in (("boa-p5-vazia", True, "BOA, soma das não explicitadas: 0 cr"), ("boa-p5-sem-secao", False, "BOA: indisponível"),
                                 ("boa-p5", True, "BOA, soma das não explicitadas: 6 cr")):
        ctx, pg = abre(b, nome=f"d02-importa-{pdf}")
        gera(pg, [f"{pdf}.pdf"])
        pg.click("#siga-usar")
        perfil = ls(pg, "perfilImportado")
        assert perfil["boa"]["naoExplicitadasPresente"] is esperado, perfil["boa"]
        assert texto in numeros_livre(pg)[1], pdf
        ctx.close()

# ------------------------------------------------------------------ RF-08 / D-06: faixa, notas, rodapé, ACE
FAIXA = "Feita por alunos de ECI. Não substitui o SIGA, o BOA nem a coordenação."
NOTA_RA13 = "Estimativa da Grade. No BOA, os créditos usados em equivalências podem continuar aparecendo na livre escolha."
NOTA_RA09 = "Idade estimada pelo semestre de aprovação. Para quem reingressou, a data que vale pode ser outra; confira com a coordenação."
NOTA_RA19 = "Período atual deduzido do histórico. Confira e corrija na prévia, se precisar."
def nota_ra20(pg):
    iso = pg.evaluate("() => window.horarios[1].consultado")                 # a data vem de js/horarios.js
    return f"Horários de referência mantidos por alunos (Notion, consultado em {iso[8:]}/{iso[5:7]}/{iso[:4]}). Podem mudar; confira no SIGA antes da inscrição."

def confere_faixa(pg, onde):
    faixa = pg.locator("#faixa-aviso")
    expect(faixa).to_be_visible()
    assert faixa.inner_text().strip() == FAIXA, (onde, faixa.inner_text())
    assert faixa.get_attribute("role") == "note" and faixa.get_attribute("aria-label")
    caixa = faixa.bounding_box()
    assert caixa["y"] <= 1, (onde, caixa)                                         # no topo
    for seletor in (".topo", "#painel"):                                           # sem cobrir o conteúdo em repouso
        alvo = pg.locator(seletor).bounding_box()
        assert alvo is None or alvo["y"] >= caixa["y"] + caixa["height"] - 1, (onde, seletor, alvo, caixa)
    # vem antes do primeiro controle na ordem de leitura e de foco
    assert pg.evaluate("() => { const f = document.getElementById('faixa-aviso'); const c = document.querySelector('button, a, input, select');"
                       " return !!(f.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }"), onde

@caso("RF-08 (08a, 08b): faixa de aviso no clássico, após recarregar, após trocar de modo e nas seis abas; sem e com perfil; desktop e celular")
def t_rf08_faixa(b):
    for rotulo, vp, toque in (("desktop", D, False), ("celular", C, True)):
        for com_perfil in (False, True):
            ctx, pg = abre(b, vp=vp, perfil=PERFIL if com_perfil else None, nome=f"rf08-faixa-{rotulo}-{com_perfil}", toque=toque)
            nome = f"{rotulo}/{'perfil' if com_perfil else 'sem perfil'}"
            confere_faixa(pg, nome + "/classico")
            pg.reload(); pg.wait_for_load_state("load"); confere_faixa(pg, nome + "/recarga")
            pg.locator(".interruptor").click(); confere_faixa(pg, nome + "/completo")
            for vista in ("grade", "timeline", "optativas", "cronograma", "pedidos", "eci"):
                pg.click(f'[data-vista="{vista}"]'); confere_faixa(pg, f"{nome}/{vista}")
                if vista == "eci" and pg.locator("#dlg-eci[open]").count(): pg.keyboard.press("Escape")
            pg.locator(".interruptor").click(); confere_faixa(pg, nome + "/de volta ao classico")
            pg.evaluate("window.scrollBy(0, 600)"); pg.wait_for_timeout(150)      # mouse.wheel não existe no WebKit móvel
            assert pg.locator("#faixa-aviso").bounding_box()["y"] <= 1                  # continua no topo ao rolar
            if rotulo == "desktop" and com_perfil: foto(pg, "rf08-faixa-desktop")
            if rotulo == "celular" and com_perfil: foto(pg, "rf08-faixa-celular")
            ctx.close()

@caso("RF-08 (08c, 08d): nota de RA-13 junto dos dois números e nota de RA-09 junto da idade")
def t_rf08_notas_credito(b):
    ctx, pg = abre(b, perfil=p5(), nome="rf08-ra13")
    completo(pg, "pedidos")
    assert pg.locator(".pedidos .livre-numeros + .nota-estimativa").inner_text() == NOTA_RA13
    completo(pg, "grade")
    if pg.locator("#progresso").is_hidden(): pg.click("#bg-detalhes")
    assert pg.locator("#progresso .cat-3 .livre-numeros + .nota-estimativa").inner_text() == NOTA_RA13
    foto(pg, "rf08-nota-livre-escolha")
    ctx.close()
    for periodo, esperado in (("2021/2", False), ("2021/1", True)):
        perfil = {"periodos": [{"nome": periodo, "disciplinas": [dict(XYZ101)]}],
                  "equivalencias": [{"cursadas": ["XYZ101"], "pedida": "COC602", "status": "a pedir"}]}
        ctx, pg = abre(b, perfil=perfil, nome=f"rf08-ra09-{periodo[:4]}", relogio=RELOGIO)
        completo(pg, "pedidos")
        notas = pg.locator(".pedidos .nota-estimativa").all_inner_texts()
        assert notas.count(NOTA_RA09) == 2, notas                                      # junto da idade e da tabela de livre escolha
        assert ("mais de 5 anos" in pg.locator('.pedidos tr[class^="eq-"]').first.inner_text()) == esperado
        ctx.close()

@caso("RF-08 (08e, 08f): nota de RA-19 só no período atual deduzido, na prévia e na linha do tempo")
def t_rf08_periodo_atual(b):
    ctx, pg = abre(b, nome="rf08-ra19-deduzido")
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    assert pg.input_value("#siga-atual") == "2026/2"
    expect(pg.locator("#siga-nota-ra19")).to_be_visible(); assert pg.locator("#siga-nota-ra19").inner_text() == NOTA_RA19
    pg.fill("#siga-atual", "2027/1"); expect(pg.locator("#siga-nota-ra19")).to_be_hidden()       # a pessoa informou outro semestre
    pg.fill("#siga-atual", "2026/2"); expect(pg.locator("#siga-nota-ra19")).to_be_visible()
    pg.click("#siga-usar")
    assert [p for p in ls(pg, "perfilImportado")["periodos"] if p.get("atual")][0].get("deduzido") is True
    completo(pg, "timeline")
    assert pg.locator(".col-atual .nota-estimativa").inner_text() == NOTA_RA19
    ctx.close()
    ctx, pg = abre(b, nome="rf08-ra19-informado")
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    pg.fill("#siga-atual", "2027/1"); pg.click("#siga-usar")
    assert "deduzido" not in [p for p in ls(pg, "perfilImportado")["periodos"] if p.get("atual")][0]
    completo(pg, "timeline")
    assert pg.locator(".col-atual").count() == 1 and pg.locator(".col-atual .nota-estimativa").count() == 0
    ctx.close()
    perfil = {"periodos": [{"nome": "2026/2", "atual": True, "disciplinas": ["MAC128"]}]}      # informado pela pessoa (perfil criado ou editado)
    ctx, pg = abre(b, perfil=perfil, nome="rf08-ra19-perfil-informado")
    completo(pg, "timeline")
    assert pg.locator(".col-atual").count() == 1 and pg.locator(".col-atual .nota-estimativa").count() == 0
    ctx.close()

@caso("RF-08 (08g, 08h): nota de RA-20 com a data de js/horarios.js no aviso de oferta, na linha do tempo e no Cronograma")
def t_rf08_oferta(b):
    ctx, pg = abre(b, perfil={"periodos": [{"nome": "2027/2", "planejado": True, "disciplinas": ["EEL871"]}]}, nome="rf08-ra20-oferta")
    nota = nota_ra20(pg)
    completo(pg, "timeline")
    assert pg.locator(".col-planejado .nota-estimativa").inner_text() == nota
    pg.locator('.col-planejado .card[data-code="EEL871"]').first.click()
    assert pg.locator("#detalhes .nota-estimativa").inner_text() == nota
    pg.keyboard.press("Escape")
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/2"]')
    assert nota in pg.locator("#painel .nota-estimativa").all_inner_texts()
    ctx.close()
    perfil = {"periodos": [{"nome": "2027/1", "planejado": True, "disciplinas": [{"code": "MAC238", "horarios": ["ter 10-12", "qui 10-12"]}]}]}
    ctx, pg = abre(b, perfil=perfil, nome="rf08-ra20-horarios")
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
    crono = pg.locator("#painel").inner_text()
    assert "ter 10-12" in crono and "qui 10-12" in crono, crono
    assert nota_ra20(pg) in pg.locator("#painel .nota-estimativa").all_inner_texts()
    foto(pg, "rf08-cronograma-nota-horarios")
    ctx.close()

@caso("RF-08: versão, data de conferência do currículo e link de relato no rodapé e na falha de importação")
def t_rf08_rodape(b):
    for rotulo, vp, toque in (("desktop", D, False), ("celular", C, True)):
        ctx, pg = abre(b, vp=vp, nome=f"rf08-rodape-{rotulo}", toque=toque)
        for modo in ("classico", "completo"):
            if modo == "completo": pg.locator(".interruptor").click()
            rodape = pg.locator(".rodape")
            rodape.scroll_into_view_if_needed()
            expect(pg.locator("#versao")).to_be_visible(); assert pg.locator("#versao").inner_text() == "v2.0.0"
            consultado = pg.evaluate("() => window.curriculoSIGA[1].consultado")
            assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", consultado), consultado
            assert pg.locator("#curriculo-conferido").inner_text() == f"Currículo conferido no SIGA em {consultado}", (rotulo, modo)
            link = pg.locator("#link-relato"); expect(link).to_be_visible()
            assert link.inner_text() == "Achou um erro? Crie uma nova issue"
            href = link.get_attribute("href")
            assert href.startswith("https://github.com/") and href.endswith("/issues/new"), href      # sem dados da pessoa
            if rotulo == "desktop" and modo == "classico": foto(pg, "rf08-rodape-classico")
        ctx.close()
    ctx, pg = abre(b, nome="rf08-relato-falha")
    pg.click("#btn-importar")
    pg.set_input_files("#siga-pdfs", files=[{"name": "invalido.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\nnao e um historico"}])
    pg.click("#siga-gerar")
    pg.wait_for_selector("#siga-status a", timeout=30000)
    texto = pg.locator("#siga-status").inner_text()
    assert texto.startswith("Não deu certo:") and "Achou um erro? Crie uma nova issue" in texto, texto
    assert pg.locator("#siga-status a").get_attribute("href") == pg.locator("#link-relato").get_attribute("href")
    ctx.close()

@caso("RF-08: horas de extensão a confirmar com o mesmo resumo na barra, no bloco da Grade, no progresso e nos Pedidos")
def t_rf08_ace(b):
    perfil = {"periodos": [{"nome": "2026/1", "disciplinas": ["EEW002"]}],
              "extensao": [{"code": "EEW002", "horas": 30, "periodo": "2026/1", "status": "validada"}]}
    ctx, pg = abre(b, perfil=perfil, nome="rf08-ace")
    completo(pg, "grade")
    assert "Extensão/ACE 30/405 h +30 h a confirmar" in pg.locator("#barra-geral .bg-total").inner_text()
    assert pg.locator(".card.bloco.cat-5 .meta").inner_text() == "30 / 405 h · +30 h a confirmar"
    pg.click("#bg-detalhes")
    assert "+30 h a confirmar" in pg.locator("#progresso .cat-5").inner_text()
    pg.click('[data-vista="pedidos"]')
    assert "+30 h a confirmar" in pg.locator(".pedidos h2:has-text('Extensão')").inner_text()
    duplicidade = pg.locator(".ace-duplicidade").inner_text()
    assert "Possível duplicidade" in duplicidade and "30 h a confirmar" in duplicidade and "confira no siga ou com a coordenação" in duplicidade.lower(), duplicidade
    foto(pg, "rf08-extensao-a-confirmar")
    ctx.close()
    ctx, pg = abre(b, perfil={"periodos": [{"nome": "2026/1", "disciplinas": ["EEW002"]}]}, nome="rf08-ace-sem-duvida")
    assert "a confirmar" not in pg.locator("#barra-geral .bg-total").inner_text()
    ctx.close()

# ------------------------------------------------------------------ PC-02/03: identificação da marcação manual
P1_MANUAL = {"periodos": [
    {"nome": "2025/1", "disciplinas": ["MAC118", {"code": "FIS111", "nota": "T"}]},
    {"nome": "2025/2", "disciplinas": [{"code": "FIT112", "status": "reprovado"}]},
]}

def detalhe_de(pg, code):
    pg.locator(f'.card[data-code="{code}"]').first.click()
    texto = pg.locator("#detalhes").inner_text()
    pg.keyboard.press("Escape")
    return texto

def legenda_do_progresso(pg):
    if pg.locator("#progresso").is_hidden(): pg.click("#bg-detalhes")
    return pg.locator("#legenda").inner_text() if pg.locator("#legenda").is_visible() else ""

@caso("PC-02 (01b): a aprovação por tag é marcação manual no detalhe e na legenda; só tag aprovada")
def t_pc02_manual_credito(b):
    ctx, pg = abre(b, perfil=P1_MANUAL, extra={"marcacoes": {"FIT112": "aprovada"}}, nome="pc02-01b")
    assert pg.evaluate("GradeInterativa.totais()[1].ok") == 11
    completo(pg, "grade")
    detalhe = detalhe_de(pg, "FIT112")
    assert "Aprovada por marcação manual (pincel)" in detalhe and "não é registro importado" in detalhe, detalhe
    assert "Reprovada" in detalhe                                      # o registro histórico continua visível, distinto da marcação
    assert "Aprovação por marcação manual (pincel)" in legenda_do_progresso(pg)
    foto(pg, "pc02-detalhe-marcacao-manual")
    ctx.close()
    # sem registro nenhum: a tag também é identificada
    ctx, pg = abre(b, perfil={"periodos": []}, extra={"marcacoes": {"MAC118": "aprovada"}}, nome="pc02-sem-registro")
    completo(pg, "grade")
    assert "Aprovada por marcação manual (pincel)" in detalhe_de(pg, "MAC118")
    ctx.close()
    # tag que não é aprovação: continua marcada com o pincel, sem rótulo de aprovação manual nem legenda
    ctx, pg = abre(b, perfil=P1_MANUAL, extra={"marcacoes": {"FIT112": "cursando"}}, nome="pc02-cursando")
    completo(pg, "grade")
    detalhe = detalhe_de(pg, "FIT112")
    assert "marcada com o pincel" in detalhe and "marcação manual" not in detalhe, detalhe
    assert "marcação manual" not in legenda_do_progresso(pg)
    ctx.close()

@caso("PC-03 (02j): a dependente mostra quando uma tag satisfaz o requisito; sem a nota quando o registro basta")
def t_pc03_manual_requisito(b):
    def nota(perfil, marcacoes, code, vista="timeline"):
        ctx, pg = abre(b, perfil=perfil, extra={"marcacoes": marcacoes}, nome=f"pc03-{code}")
        completo(pg, vista)
        card = pg.locator(f'.card[data-code="{code}"]').first
        titulo = card.get_attribute("title") or ""
        assert "Requisito" not in titulo and "Co-requisito" not in titulo, titulo                  # a tag satisfaz: sem aviso
        card.click()
        linhas = pg.locator("#detalhes .aviso-manual").all_inner_texts()
        completo_texto = pg.locator("#detalhes").inner_text()
        foto(pg, f"pc03-{code}")
        ctx.close()
        return linhas, completo_texto
    planejada = {"periodos": [{"nome": "2027/1", "planejado": True, "disciplinas": ["MAC128"]}]}
    linhas, texto = nota(planejada, {"MAC118": "aprovada"}, "MAC128")                       # 02j
    assert len(linhas) == 1 and "MAC118" in linhas[0] and "marcação manual" in linhas[0] and "simulação" in linhas[0], linhas
    assert "Aprovada por marcação manual (pincel)" in texto
    registro = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118"]}, {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC128"]}]}
    assert nota(registro, {"MAC118": "aprovada"}, "MAC128")[0] == []                         # o registro datado já cumpre: sem nota
    assert nota(registro, {}, "MAC128")[0] == []
    coreq = {"periodos": [{"nome": "2026/1", "disciplinas": ["EEL670"]}, {"nome": "2027/2", "planejado": True, "disciplinas": ["EEL418"]}]}
    linhas, _ = nota(coreq, {"COS231": "aprovada"}, "EEL418")                                # co-requisito por tag
    assert len(linhas) == 1 and "COS231" in linhas[0], linhas
    linhas, _ = nota({"periodos": []}, {"MAC118": "aprovada"}, "MAC128", "grade")            # dependente fora de qualquer período
    assert len(linhas) == 1 and "MAC118" in linhas[0], linhas

# ------------------------------------------------------------------ D-01: carga horária como orientação
def boa_com(*itens):
    return {"emissao": "20/11/2026", "naoExplicitadasPresente": True, "naoExplicitadas": [
        {"code": c, "name": f"Cursada fictícia {c}", "credits": 4, "ch": ch, "grau": "7.0"} for c, ch in itens]}

def perfil_carga(cursadas, boa, pedida="EEL817", extra_periodos=()):
    codigos = [c["code"] if isinstance(c, dict) else c for c in cursadas]
    return {"periodos": [{"nome": "2024/1", "disciplinas": [dict(XYZ101, code=c, name=f"Cursada fictícia {c}") for c in codigos]}, *extra_periodos],
            "equivalencias": [{"cursadas": cursadas, "pedida": pedida, "status": "a pedir"}], "boa": boa}

def checagens(pg):
    completo(pg, "pedidos")
    linha = pg.locator('.pedidos tr[class^="eq-"]').first
    itens = linha.locator(".checks li")
    return [{"texto": itens.nth(i).inner_text(), "classe": itens.nth(i).get_attribute("class") or ""} for i in range(itens.count())]

def linha_carga(itens):
    achadas = [x for x in itens if x["classe"].split() == ["orientacao-carga"]]
    assert len(achadas) == 1, itens
    return achadas[0]

@caso("D-01 (03d–03f, 03g): a carga horária é orientação neutra, sem ✓/✗, e a pedida sem carga fica indisponível")
def t_d01_carga(b):
    for cenario, horas, esperado in (("03d", 45, "45 h de 60 h: abaixo da carga da pedida"), ("03e", 60, "60 h de 60 h: igual"),
                                      ("03f", 75, "75 h de 60 h: acima")):
        ctx, pg = abre(b, perfil=perfil_carga(["XYZ101"], boa_com(("XYZ101", horas))), nome=f"d01-{cenario}")
        itens = checagens(pg)
        carga = linha_carga(itens)
        assert esperado in carga["texto"], (cenario, carga)
        assert "✓" not in carga["texto"] and "✗" not in carga["texto"] and "C.H." not in carga["texto"], carga
        assert not any(x["classe"] in ("ok", "alerta") and "carga" in x["texto"].lower() for x in itens), itens     # nenhuma aparência de aprovação ou falha
        if cenario == "03d": foto(pg, "d01-carga-orientacao")
        ctx.close()
    pedida_sem_carga = {"nome": "2027/1", "planejado": True, "disciplinas": [{"code": "XYZ202", "name": "Pedida fictícia", "credits": 4, "category": 2}]}
    ctx, pg = abre(b, perfil=perfil_carga(["XYZ101"], boa_com(("XYZ101", 60)), pedida="XYZ202", extra_periodos=[pedida_sem_carga]), nome="d01-03g")
    carga = linha_carga(checagens(pg))
    assert "Carga horária da pedida indisponível" in carga["texto"], carga
    assert not re.search(r"igual|abaixo|acima|✓|✗", carga["texto"]), carga                      # nada é considerado cumprido
    ctx.close()

@caso("D-01 (03h, 03j): o sinal de conteúdo segue separado; carga de cursadas só por horas soma na orientação")
def t_d01_conteudo(b):
    cursadas = [{"code": "XYZ101", "papel": "horas"}, {"code": "ABC123", "papel": "horas"}]
    ctx, pg = abre(b, perfil=perfil_carga(cursadas, boa_com(("XYZ101", 30), ("ABC123", 30))), nome="d01-03h")
    itens = checagens(pg)
    conteudo = [x for x in itens if "nenhuma cursada marcada como conteúdo" in x["texto"]]
    assert len(conteudo) == 1 and conteudo[0] is not linha_carga(itens), itens                 # sinal separado da linha de carga
    assert "60 h de 60 h: igual" in linha_carga(itens)["texto"]
    ctx.close()
    cursadas = [{"code": "XYZ101", "papel": "conteudo"}, {"code": "ABC123", "papel": "horas"}]
    ctx, pg = abre(b, perfil=perfil_carga(cursadas, boa_com(("XYZ101", 45), ("ABC123", 15))), nome="d01-03j")
    itens = checagens(pg)
    assert "60 h de 60 h: igual" in linha_carga(itens)["texto"], itens
    assert not any("conteúdo" in x["texto"] for x in itens), itens                             # nenhuma falta de conteúdo
    ctx.close()
    # carga de uma cursada indisponível: a soma não a inclui e isso aparece em linha própria, neutra
    ctx, pg = abre(b, perfil=perfil_carga(["XYZ101", "ABC123"], boa_com(("XYZ101", 45), ("ABC123", 0))), nome="d01-cursada-sem-carga")
    itens = checagens(pg)
    sem = [x for x in itens if "Carga horária indisponível para ABC123" in x["texto"]]
    assert len(sem) == 1 and sem[0]["classe"] == "orientacao-carga", itens
    assert "45 h de 60 h: abaixo da carga da pedida" in linha_carga([x for x in itens if x not in sem])["texto"]
    ctx.close()

# ------------------------------------------------------------------ regressões gerais
@caso("Regressões: abas, busca de optativas mantém foco, horários por clique, equivalências/ACE, exportação e recarga")
def t_regressao(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="regressao")
    completo(pg)
    for v in ["grade", "timeline", "optativas", "cronograma", "pedidos"]:
        pg.click(f'[data-vista="{v}"]'); assert pg.locator("#painel").inner_text().strip(), v
    pg.click('[data-vista="optativas"]'); pg.click("#busca-opt"); pg.keyboard.type("dados")
    assert pg.evaluate("document.activeElement.id") == "busca-opt" and pg.input_value("#busca-opt") == "dados"
    pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/1"]'); pg.click('[data-csel="COS360"]')
    pg.locator('.cel[data-cel="108"]').dispatch_event("mousedown"); pg.mouse.up()
    assert "ter 08-09" in pg.locator('.crono-item:has([data-csel="COS360"])').inner_text()
    cr = pg.locator(".crono-lista h3 small").inner_text(); assert "cr" in cr
    pg.click('[data-vista="pedidos"]'); pg.click("#ext-add"); assert pg.locator("[data-extdel]").count() == 1
    pg.click('[data-vista="grade"]'); pg.locator('.card[data-code="MAC128"]').click()
    assert "pré-requisitos" in pg.locator("#detalhes").inner_text().lower()
    pg.keyboard.press("Escape")
    with pg.expect_download() as d: pg.click("#baixar-importado")
    assert "window.PERFIL" in pathlib.Path(d.value.path()).read_text(encoding="utf-8")
    pg.reload(); pg.wait_for_load_state("load"); assert not pg.locator("#modo-classico").is_checked()
    # privacidade: textos que antes eram engolidos pelo ícone aparecem
    pg.click("#btn-privacidade"); txt = pg.locator("#detalhes").inner_text()
    assert "Apagar tudo deste navegador" in txt and "Baixar meus dados" in txt
    pg.keyboard.press("Escape"); pg.click('[data-vista="grade"]')
    assert "Borracha" in pg.locator("#paleta").inner_text()
    ctx.close()

@caso("Acessibilidade: foco visível no cabeçalho, alvos ≥ 44px no celular, contraste dos avisos ≥ 4,5:1 nos dois temas")
def t_a11y(b):
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C, esquema=esq, perfil=PERFIL, nome=f"a11y-{esq}", toque=True)
        for sel in ["#btn-importar", "#btn-perfil", "#btn-privacidade", "#btn-tema", ".interruptor"]:
            r = pg.locator(sel).bounding_box(); assert r["height"] >= 44 and r["width"] >= 44, (sel, r)
        completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
        razoes = pg.evaluate("""() => {
          const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
          const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; })
            .reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
          const fundo = (el) => { while (el) { const c = getComputedStyle(el).backgroundColor; const v = rgb(c); if (v.length === 3 || (v[3] ?? 1) > .9) return v.slice(0, 3); el = el.parentElement; } return [255, 255, 255]; };
          const razao = (el) => { const a = lum(rgb(getComputedStyle(el).color).slice(0, 3)), b = lum(fundo(el)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
          return [...document.querySelectorAll('.aviso-oferta, small.alerta, .crono-pick small, #subtitulo, .dica')].slice(0, 40)
            .filter((e) => e.offsetParent).map((e) => [e.className || e.id, +razao(e).toFixed(2)]);
        }""")
        ruins = [r for r in razoes if r[1] < 4.5]; assert not ruins, (esq, ruins)
        pg.keyboard.press("Escape")
        pg.locator("#btn-tema").focus(); pg.keyboard.press("Shift+Tab"); pg.keyboard.press("Tab")
        assert pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid"
        foto(pg, f"24-foco-visivel-tema-celular-{esq}")
        ctx.close()

@caso("Descartar perfil salvo (sem perfil/perfil.js): rótulo claro, confirmação e volta ao estado sem perfil")
def t_descartar_salvo(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="descartar-salvo")
    link = pg.locator("#descartar-importado"); assert link.inner_text() == "Descartar perfil salvo"
    msgs = []
    pg.once("dialog", lambda d: (msgs.append(d.message), d.accept())); link.click()
    assert "Os planos, pedidos e a extensão guardados nele também saem" in msgs[0], msgs
    expect(pg.locator("#titulo")).to_have_text("Grade ECI"); assert pg.locator("#barra-geral").is_hidden()
    assert ls(pg, "perfilImportado") is None
    ctx.close()

# ================================================================== rodada 2
PLANO = json.loads((FX / "perfil-com-plano-2026-2.json").read_text(encoding="utf-8"))
def snapshot(pg): return pg.evaluate("K => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith(K)).sort().map((k) => [k, localStorage.getItem(k)]))", CHAVE)

@caso("Importação preserva o plano de 2026/2 ao corrigir o atual para 2027/1; colisão pede saída explícita; descartar prévia não muda o salvo")
def t_plano_preservado(b):
    ctx, pg = abre(b, perfil=PLANO, nome="plano-2026-2")
    antes = snapshot(pg)
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    assert pg.input_value("#siga-atual") == "2026/2" and pg.locator("#siga-usar").is_disabled()
    assert "O plano de 2026/2 (2 disciplinas) é o período atual escolhido" in pg.locator("#siga-planos").inner_text()
    foto(pg, "30-siga-colisao-plano")
    pg.click("#siga-descartar"); expect(pg.locator("#siga-usar")).to_have_count(0)
    pg.locator("#detalhes .fechar").click(); assert snapshot(pg) == antes             # descartar a prévia não mexe em nada
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); pg.locator("#detalhes .fechar").click()
    pg.reload(); assert snapshot(pg) == antes                                          # fechar/recarregar também não
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); pg.fill("#siga-atual", "2027/1")
    expect(pg.locator("#siga-usar")).to_be_enabled(); assert "Planos mantidos: 2026/2 (2 disciplinas)" in pg.locator("#siga-planos").inner_text()
    foto(pg, "31-siga-plano-mantido")
    pg.click("#siga-usar"); p = ls(pg, "perfilImportado")
    plano = [x for x in p["periodos"] if x["nome"] == "2026/2"]
    assert plano and plano[0].get("planejado") and plano[0]["disciplinas"] == PLANO["periodos"][3]["disciplinas"], plano
    assert [x["nome"] for x in p["periodos"] if x.get("atual")] == ["2027/1"]
    assert [x["nome"] for x in p["periodos"]] == ["2025/1", "2025/2", "2026/1", "2026/2", "2027/1", "2027/2"], [x["nome"] for x in p["periodos"]]
    pg.reload(); completo(pg, "cronograma"); pg.click('[data-cperiodo="2026/2"]')
    assert "ter 08-10, qui 08-10" in pg.locator('.crono-item:has([data-csel="EEL881"])').inner_text()
    # saída explícita: manter 2026/2 como atual exige confirmar a substituição do plano
    ctx.close(); ctx, pg = abre(b, perfil=PLANO, nome="plano-substitui")
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); pg.check("#siga-descartar-planos")
    expect(pg.locator("#siga-usar")).to_be_enabled(); pg.click("#siga-usar")
    p = ls(pg, "perfilImportado"); assert [x["nome"] for x in p["periodos"] if x.get("atual")] == ["2026/2"] and not any(x.get("planejado") and x["nome"] == "2026/2" for x in p["periodos"])
    ctx.close()


@caso("Aviso dos PDFs junto do seletor, antes da seleção")
def t_aviso_pdf(b):
    ctx, pg = abre(b, nome="aviso-pdf")
    pg.click("#btn-importar")
    aviso = pg.locator("#siga-aviso-pdf"); expect(aviso).to_be_visible()
    assert aviso.inner_text().strip() == "O BOA e o Histórico são lidos neste navegador. Os PDFs não são enviados ao GitHub."
    assert pg.locator("#siga-pdfs").get_attribute("aria-describedby") == "siga-aviso-pdf"
    assert aviso.bounding_box()["y"] < pg.locator("#siga-pdfs").bounding_box()["y"]
    foto(pg, "36-aviso-pdfs")
    ctx.close()

def caminhos(pg): return pg.locator("#painel > svg.setas path.seta").count()
@caso("Setas: Ocultas por padrão; foco por mouse, teclado e toque; contínua × tracejada; Todas; alinhamento ao redimensionar; cartões clicáveis")
def t_setas(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="setas")
    completo(pg, "grade")
    assert pg.locator('input[name="setas"][value="ocultas"]').is_checked() and pg.locator("svg.setas").count() == 0
    pg.locator('.card[data-code="MAC128"]').hover(); assert pg.locator("svg.setas").count() == 0
    pg.check('input[name="setas"][value="foco"]'); assert ls(pg, "exibir")["setas"] == "foco"
    pg.locator('.card[data-code="MAC128"]').hover()
    entra = pg.locator("svg.setas path.seta.entra"); sai = pg.locator("svg.setas path.seta.sai")
    assert entra.count() == 1 and sai.count() == 3, (entra.count(), sai.count())   # MAC118 → MAC128; MAC128 → MAC238, MAC248, FIM230
    # a ponta da seta encosta na disciplina que exige o requisito
    d = entra.first.get_attribute("d"); fim = [float(x) for x in re.findall(r"-?\d+\.?\d*", d)[-2:]]
    box = pg.evaluate("""() => { const p = document.querySelector('#painel').getBoundingClientRect(), c = document.querySelector('.card[data-code="MAC128"]').getBoundingClientRect();
                         return [c.left - p.left + document.querySelector('#painel').scrollLeft, c.top - p.top + c.height / 2]; }""")
    assert abs(fim[0] - (box[0] - 2)) < 1.5 and abs(fim[1] - box[1]) < 1.5, (fim, box)
    pg.mouse.move(5, 5)
    pg.locator('.card[data-code="COS231"]').focus()                   # teclado
    assert pg.locator("svg.setas path.seta.coreq").count() == 1 and pg.locator("svg.setas path.seta.req").count() >= 3
    assert pg.locator("svg.setas path.seta.coreq").evaluate("e => getComputedStyle(e).strokeDasharray") != "none"
    assert pg.locator("svg.setas path.seta.req").first.evaluate("e => getComputedStyle(e).strokeDasharray") == "none"
    antes = pg.locator("svg.setas path.seta.coreq").get_attribute("d")
    pg.set_viewport_size({"width": 1180, "height": 900}); pg.wait_for_timeout(300)
    assert pg.locator("svg.setas path.seta.coreq").get_attribute("d") != antes          # redesenhou ao redimensionar
    pg.locator('.card[data-code="COS231"]').click()                    # cartões continuam clicáveis por baixo do SVG
    expect(pg.locator("#detalhes")).to_be_visible(); assert "Estruturas de Dados" in pg.locator("#detalhes").inner_text()
    pg.keyboard.press("Escape")
    pg.check('input[name="setas"][value="todas"]'); n = caminhos(pg)
    total = pg.evaluate("""() => { let n = 0; for (const c of window.courses[1]) n += (c.requirements || []).length + (c.corequirements || []).length; return n; }""")
    assert n == total, (n, total)
    foto(pg, "37-setas-todas")
    ctx.close()
    ctx, pg = abre(b, vp=C, perfil=PERFIL, extra={"exibir": {"codigo": True, "setas": "foco"}, "modoClassico": False, "vista": "grade"}, nome="setas-toque", toque=True)
    pg.locator('.card[data-code="MAC238"]').tap(); assert pg.locator("svg.setas path.seta.entra").count() == 1
    expect(pg.locator("#detalhes")).to_be_visible()
    pg.locator("#detalhes .fechar").tap()
    pg.locator('.card[data-code="MAC238"]').scroll_into_view_if_needed(); foto(pg, "38-setas-toque-celular")
    ctx.close()

ANTIGAS_TAGS = [{"id": "aprovada", "nome": "Aprovada", "cor": "#16a34a", "status": "aprovado"},
                {"id": "aprov-esperada", "nome": "Aprovação esperada", "cor": "#84cc16", "status": "previsto"},
                {"id": "cursando", "nome": "Cursando", "cor": "#2563eb", "status": "cursando"},
                {"id": "reprov-esperada", "nome": "Reprovação esperada", "cor": "#dc2626", "status": "reprovado"},
                {"id": "planejada", "nome": "Planejada", "cor": "#7c3aed", "status": "planejado"}]
@caso("Tags: paleta Cursada/Cursando/Planejada; migração do padrão antigo sem mudar estados; tags personalizadas preservadas")
def t_tags(b):
    ctx, pg = abre(b, nome="tags-novas")
    nomes = pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()
    assert [n.split()[0] for n in nomes] == ["Cursada", "Cursando", "Planejada", "Borracha"], nomes
    assert "conta como concluída" in pg.locator('[data-pincel="aprovada"]').get_attribute("title").lower() or "Concluída" in pg.locator('[data-pincel="aprovada"]').get_attribute("title")
    ctx.close()
    # navegador com o padrão antigo salvo e marcação "Aprovação esperada"
    ctx, pg = abre(b, extra={"tags": ANTIGAS_TAGS, "marcacoes": {"COS110": "aprov-esperada", "COS111": "aprovada"}}, nome="tags-migra")
    nomes = [n.split("\n")[0].strip() for n in pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()]
    nomes = [n.rsplit(" ", 1)[0] if n[-1:].isdigit() else n for n in nomes]
    assert nomes[:3] == ["Cursada", "Cursando", "Planejada"] and any(n.startswith("Aprovação esperada") for n in nomes) and not any(n.startswith("Reprovação") for n in nomes), nomes
    tot = pg.evaluate("GradeInterativa.totais()")
    assert tot["1"]["prev"] == 5 and tot["1"]["ok"] == 2, tot["1"]                         # COS110 continua prevista, COS111 concluída
    ctx.close()
    # perfil antigo com estado "previsto" sem tag na paleta: cartão continua pintado
    ctx, pg = abre(b, perfil=PERFIL, nome="tags-perfil")
    assert "com-tag" in pg.locator('.card[data-code="MAC118"]').get_attribute("class")
    ctx.close()
    custom = [{"id": "minha", "nome": "Quero fazer", "cor": "#0891b2", "status": "planejado"}]
    ctx, pg = abre(b, extra={"tags": custom}, nome="tags-custom")
    assert [n.split()[0] for n in pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()][:2] == ["Quero", "Borracha"]
    ctx.close()

@caso("Cadeado: só ícone com nome acessível, começa desligado e lembra; protege cursadas e aprovadas do perfil; detalhes e setas continuam")
def t_cadeado(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="cadeado")
    cad = pg.locator("#cadeado")
    assert cad.get_attribute("aria-label") == "Proteger disciplinas cursadas" and cad.get_attribute("aria-pressed") == "false" and not cad.locator(".so-texto").is_visible()
    pg.click('[data-pincel="cursando"]'); pg.locator('.card[data-code="EEL871"]').click()     # sem cadeado: pinta normalmente
    assert ls(pg, "marcacoes")["EEL871"] == "cursando"
    pg.click('[data-pincel="aprovada"]'); pg.locator('.card[data-code="COS471"]').click()     # marcada como Cursada
    cad.focus(); pg.keyboard.press("Enter")
    expect(pg.locator("#cadeado")).to_have_attribute("aria-pressed", "true"); assert ls(pg, "cadeado") is True
    expect(pg.locator("#anuncio")).to_contain_text("Cadeado ligado")
    pg.reload(); expect(pg.locator("#cadeado")).to_have_attribute("aria-pressed", "true")
    antes = ls(pg, "marcacoes")
    pg.click('[data-pincel=""]')                                                              # borracha
    pg.locator('.card[data-code="COS110"]').click()                                           # aprovada pelo perfil
    pg.locator('.card[data-code="COS471"]').click()                                           # marcada como Cursada
    assert ls(pg, "marcacoes") == antes
    expect(pg.locator("#anuncio")).to_contain_text("protegida pelo cadeado")
    expect(pg.locator("#detalhes")).to_be_visible()                                           # os detalhes continuam acessíveis
    assert pg.locator("#detalhes [data-settag]").first.is_disabled()
    foto(pg, "39-cadeado-ligado")
    pg.locator('.card[data-code="EEL871"]').click(); assert ls(pg, "marcacoes")["EEL871"] == ""   # não protegida: a borracha funciona
    pg.keyboard.press("Escape"); completo(pg, "grade"); pg.check('input[name="setas"][value="foco"]')
    pg.locator('.card[data-code="COS110"]').hover(); assert pg.locator("svg.setas path.seta").count() > 0
    ctx.close()


CASOS2 = [t_plano_preservado, t_aviso_pdf, t_setas, t_tags, t_cadeado]

# ================================================================== rodada 3
PLANOS2 = {"titulo": "Grade ECI", "nome": "Caio", "curso": 1, "periodos": [
    {"nome": "2025/1", "disciplinas": ["COS110", "COS111"]},
    {"nome": "2025/2", "planejado": True, "disciplinas": [{"code": "EEL670", "horarios": ["seg 10-12"]}]},
    {"nome": "2026/2", "planejado": True, "disciplinas": [{"code": "EEL881", "horarios": ["ter 08-10", "qui 08-10"]}, "EEL580"]}]}

def sem_download(pg, acao, ms=1500):
    baixados = []; pg.on("download", lambda d: baixados.append(d)); acao(); pg.wait_for_timeout(ms); return baixados

@caso("Prévia: confirmação desmarca quando muda o conjunto de planos em conflito; Usar e Baixar bloqueiam juntos, inclusive no clique")
def t_previa_confirmacao(b):
    ctx, pg = abre(b, perfil=PLANOS2, nome="previa-confirmacao")
    salvo = snapshot(pg)
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])
    pg.fill("#siga-atual", "2027/1")                                  # só o plano de 2025/2 colide (com o Histórico)
    descartados = pg.locator("#siga-planos .colisao-planos p")
    mantidos = pg.locator("#siga-planos .ok-planos")
    expect(descartados).to_contain_text("2025/2")
    expect(descartados).to_contain_text("já está no histórico importado")
    expect(descartados).not_to_contain_text("2026/2")
    expect(mantidos).to_contain_text("2026/2")
    assert pg.locator("#siga-usar").is_disabled() and pg.locator("#siga-baixar").is_disabled()
    pg.check("#siga-descartar-planos")
    expect(pg.locator("#siga-usar")).to_be_enabled(); expect(pg.locator("#siga-baixar")).to_be_enabled()
    pg.fill("#siga-atual", "2027/1")                                  # mesmo conjunto: a marcação continua
    assert pg.locator("#siga-descartar-planos").is_checked()
    foto(pg, "50-previa-confirmada-2025-2")
    pg.fill("#siga-atual", "2026/2")                                  # agora também colide com o plano de 2026/2
    assert not pg.locator("#siga-descartar-planos").is_checked()
    assert pg.locator("#siga-usar").is_disabled() and pg.locator("#siga-baixar").is_disabled()
    assert "2026/2" in pg.locator("#siga-planos").inner_text()
    foto(pg, "51-previa-desmarcada-2026-2")
    # acionar os botões mesmo sem o atributo disabled: a validação do clique bloqueia os dois
    pg.evaluate("document.querySelectorAll('#siga-usar, #siga-baixar').forEach((x) => x.disabled = false)")
    assert sem_download(pg, lambda: pg.click("#siga-baixar")) == []
    pg.evaluate("document.querySelector('#siga-usar').disabled = false"); pg.click("#siga-usar"); pg.wait_for_timeout(300)
    assert pg.locator("#siga-usar").is_disabled() and pg.locator("#siga-baixar").is_disabled()
    assert snapshot(pg) == salvo
    ctx.close()

@caso("Prévia: corrigir o atual para 2027/1 e baixar mantém o plano de 2026/2 com disciplinas e horários; o perfil salvo não muda")
def t_previa_download(b):
    ctx, pg = abre(b, perfil=PLANO, nome="previa-download")
    salvo = snapshot(pg)
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); pg.fill("#siga-atual", "2027/1")
    expect(pg.locator("#siga-baixar")).to_be_enabled()
    with pg.expect_download() as d: pg.click("#siga-baixar")
    txt = pathlib.Path(d.value.path()).read_text(encoding="utf-8")
    perfil = json.loads(re.sub(r"^.*?window\.PERFIL = ", "", txt, flags=re.S).rstrip().rstrip(";"))
    p26 = [x for x in perfil["periodos"] if x["nome"] == "2026/2"]
    assert p26 and p26[0].get("planejado") and p26[0]["disciplinas"] == PLANO["periodos"][3]["disciplinas"], p26
    assert [x["nome"] for x in perfil["periodos"] if x.get("atual")] == ["2027/1"]
    assert snapshot(pg) == salvo
    ctx.close()

def abre_config(pg):
    pg.click("#btn-config"); expect(pg.locator("#dlg-config")).to_be_visible()

@caso("Navegação: Ícone e texto (padrão), Somente texto e Somente ícone nas abas e atalhos; nomes acessíveis, aba ativa e foco; desktop e celular")
def t_formatos(b):
    for vp, toque, nome in [(D, False, "desktop"), (C, True, "celular")]:
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, extra={"modoClassico": False, "vista": "timeline"}, nome=f"formatos-{nome}", toque=toque)
        tab = pg.locator('[data-vista="timeline"]'); atal = pg.locator("#btn-privacidade")
        vis = lambda el, s: el.locator(s).evaluate("e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 2; }")
        assert vis(tab, ".ico") and vis(tab, ".rot") and vis(atal, ".ico") and vis(atal, ".rot")
        abre_config(pg); pg.check('#dlg-config input[name="aparencia"][value="texto"]'); pg.keyboard.press("Escape")
        assert not vis(tab, ".ico") and vis(tab, ".rot") and not vis(atal, ".ico") and vis(atal, ".rot")
        assert ls(pg, "aparencia") == "texto"
        abre_config(pg); pg.check('#dlg-config input[name="aparencia"][value="icone"]'); pg.keyboard.press("Escape")
        assert vis(tab, ".ico") and not vis(tab, ".rot") and vis(atal, ".ico") and not vis(atal, ".rot")
        expect(pg.get_by_role("tab", name="Linha do tempo")).to_have_attribute("aria-selected", "true")
        expect(pg.get_by_role("button", name="Privacidade")).to_be_visible()
        expect(pg.get_by_role("button", name="Configurações")).to_be_visible()
        pg.get_by_role("tab", name="Optativas").focus(); pg.keyboard.press("Shift+Tab"); pg.keyboard.press("Tab")
        assert pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid"
        if toque:
            for el in pg.locator(".acoes .btn, .abas button").all():
                r = el.bounding_box(); assert r["height"] >= 44 and r["width"] >= 44, r
        foto(pg, f"52-somente-icone-{nome}")
        pg.reload(); assert pg.evaluate("document.documentElement.dataset.aparencia") == "icone"
        abre_config(pg); assert pg.locator('#dlg-config input[name="aparencia"][value="icone"]').is_checked()
        pg.check('#dlg-config input[name="aparencia"][value="icone-texto"]'); assert ls(pg, "aparencia") is None
        ctx.close()

@caso("Atalhos: todos começam desafixados; fixar/desafixar persiste; acesso continua em Configurações; Referências sem requisição externa")
def t_atalhos(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="atalhos", atalhos=False)
    assert pg.locator("#atalhos button").count() == 0 and pg.locator("#btn-config").is_visible()
    abre_config(pg)
    for id_ in ["perfil", "importar", "tema", "privacidade", "referencias", "tags"]:
        assert pg.locator(f'[data-fixar="{id_}"]').get_attribute("aria-pressed") == "false", id_
    assert pg.locator("[data-abrir-atalho]").count() == 5                     # tema: radio + fixar
    pg.locator('[data-fixar="referencias"]').click(); pg.locator('[data-fixar="tema"]').focus(); pg.keyboard.press("Enter")
    assert pg.locator('[data-fixar="tema"]').get_attribute("aria-pressed") == "true" and pg.evaluate("document.activeElement.dataset.fixar") == "tema"
    assert ls(pg, "atalhos") == ["tema", "referencias"]
    foto(pg, "53-configuracoes-fixados")
    pg.keyboard.press("Escape")
    assert pg.locator("#btn-tema").is_visible() and pg.locator("#btn-referencias").is_visible() and pg.locator("#btn-perfil").count() == 0
    pg.reload(); assert pg.locator("#btn-referencias").is_visible()
    abre_config(pg); assert pg.locator('[data-abrir-atalho="referencias"]').count() == 1
    pg.locator('[data-abrir-atalho="referencias"]').click()                  # abre pelo acesso de Configurações
    expect(pg.locator("#detalhes")).to_contain_text("De onde vêm os dados")
    links = pg.locator("#detalhes a").evaluate_all("as => as.map((a) => [a.href, a.target, a.rel])")
    assert [l[0] for l in links] == ["https://intranet.ufrj.br/", "https://www.siga.ufrj.br/sira/repositorio-curriculo/distribuicoes/A46B41C8-92A4-F79C-7383-BE627D84214E.html",
                                     "https://github.com/JoaoAndrade01/grade", "https://github.com/gremio-eci/grade"], links
    assert all(l[1] == "_blank" and "noopener" in l[2] for l in links)
    foto(pg, "54-referencias")
    pg.keyboard.press("Escape"); abre_config(pg); pg.locator('[data-fixar="referencias"]').click(); pg.keyboard.press("Escape")
    assert pg.locator("#btn-referencias").count() == 0 and ls(pg, "atalhos") == ["tema"]
    assert not [e for e in eventos if "[atalhos]" in e and "EXTERNA" in e]
    ctx.close()

@caso("Primeira visita: modo clássico com seletor visível; ocultar o seletor preserva o modo; trocar de modo em Configurações com o seletor oculto")
def t_modo(b):
    ctx, pg = abre(b, nome="modo", atalhos=False)
    assert pg.locator("#modo-classico").is_checked() and pg.locator("#seletor-modo").is_visible()
    abre_config(pg); assert pg.locator('#dlg-config input[name="modo"][value="classico"]').is_checked() and pg.locator("#cfg-seletor").is_checked()
    pg.uncheck("#cfg-seletor")
    assert ls(pg, "ocultarSeletor") is True and pg.locator("#seletor-modo").is_hidden() and pg.locator('#dlg-config input[name="modo"][value="classico"]').is_checked()
    pg.check('#dlg-config input[name="modo"][value="completo"]'); pg.keyboard.press("Escape")
    assert pg.locator(".abas").is_visible() and pg.locator("#seletor-modo").is_hidden() and ls(pg, "modoClassico") is False
    foto(pg, "55-seletor-oculto-modo-completo")
    pg.reload(); assert pg.locator(".abas").is_visible() and pg.locator("#seletor-modo").is_hidden()
    abre_config(pg); pg.check('#dlg-config input[name="modo"][value="classico"]'); pg.check("#cfg-seletor"); pg.keyboard.press("Escape")
    assert pg.locator("#seletor-modo").is_visible() and pg.locator("#modo-classico").is_checked()
    ctx.close()

@caso("Configurações sincroniza Grade → Exibir, setas e o cadeado da paleta, nos dois sentidos; preferências antigas preservadas")
def t_sync(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": {"codigo": False, "notas": True, "setas": "foco"},
                                            "tags": [{"id": "minha", "nome": "Quero fazer", "cor": "#0891b2", "status": "planejado"}]}, nome="sync")
    abre_config(pg)
    assert not pg.locator('#dlg-config [data-exibir="codigo"]').is_checked() and pg.locator('#dlg-config [data-exibir="notas"]').is_checked()
    assert pg.locator('#dlg-config input[name="setas"][value="foco"]').is_checked()
    pg.check('#dlg-config [data-exibir="dificuldade"]'); pg.check('#dlg-config input[name="setas"][value="todas"]'); pg.check("#cfg-cadeado")
    pg.keyboard.press("Escape")
    assert pg.locator('#ferramentas [data-exibir="dificuldade"]').is_checked() and pg.locator('#ferramentas input[name="setas"][value="todas"]').is_checked()
    assert pg.locator("#cadeado").get_attribute("aria-pressed") == "true"
    pg.click("#cadeado"); pg.check('#ferramentas input[name="setas"][value="ocultas"]')
    abre_config(pg); assert not pg.locator("#cfg-cadeado").is_checked() and pg.locator('#dlg-config input[name="setas"][value="ocultas"]').is_checked()
    pg.keyboard.press("Escape")
    assert pg.locator("#paleta").inner_text().strip().startswith("Detalhes") and "Quero fazer" in pg.locator("#paleta").inner_text()   # tags personalizadas
    ctx.close()

EXPS = ["COS110", "COS242", "EEL873"]
@caso("Paleta ECI por trás: destaca as três disciplinas, atenua e inativa as outras; tela cheia com Voltar e Esc; foco volta ao cartão (teclado e toque)")
def t_seletor_eci(b):
    for vp, toque, nome in [(D, False, "desktop"), (C, True, "celular")]:
        ctx, pg = abre(b, vp=vp, extra={"modoClassico": False, "vista": "grade"}, nome=f"seletor-eci-{nome}", toque=toque, atalhos=False)
        antes = snapshot(pg)
        pg.click("#pal-eci"); expect(pg.locator("#pal-eci")).to_have_attribute("aria-pressed", "true")
        assert sorted(pg.locator(".card.com-eci").evaluate_all("cs => cs.map((c) => c.dataset.code)")) == EXPS
        assert pg.locator('.card[data-code="MAC118"]').get_attribute("inert") is not None
        assert pg.locator(".card[inert]").count() >= 40
        foto(pg, f"56-seletor-eci-{nome}")
        card = pg.locator('.card[data-code="COS242"]')
        if toque: card.tap()
        else: card.focus(); pg.keyboard.press("Enter")
        dlg = pg.locator("#dlg-eci"); expect(dlg).to_be_visible()
        box = dlg.bounding_box(); assert box["width"] >= vp["width"] - 1 and box["height"] >= vp["height"] - 1, box
        expect(pg.locator("#dlg-eci-titulo")).to_have_text("COS242 · Teoria dos Grafos · 4º período")
        pg.keyboard.press("Escape"); expect(dlg).to_be_hidden()
        assert pg.evaluate("document.activeElement.dataset.code") == "COS242"
        pg.locator('.card[data-code="EEL873"]').click(); pg.click("#eci-voltar"); expect(dlg).to_be_hidden()
        assert pg.evaluate("document.activeElement.dataset.code") == "EEL873"
        pg.click("#pal-eci"); assert pg.locator(".card[inert]").count() == 0
        assert snapshot(pg) == antes
        ctx.close()

@caso("Experiências sem perfil (teclado e toque): COS110 do PDF à prévia, COS242 grafo com ciclo simulado, EEL873 paridade com cenários")
def t_experiencias(b):
    for vp, toque, nome in [(D, False, "desktop"), (C, True, "celular")]:
        ctx, pg = abre(b, vp=vp, extra={"modoClassico": False}, nome=f"exp-{nome}", toque=toque, atalhos=False)
        antes = snapshot(pg)
        toca = (lambda loc: loc.tap()) if toque else (lambda loc: loc.press("Enter"))
        pg.click('[data-vista="eci"]')
        expect(pg.locator(".eci-lista li")).to_have_count(3)
        assert "ECI por trás" in pg.locator(".eci-passos").inner_text()
        # ---- COS110
        cos110 = pg.locator('[data-eci-abrir="COS110"]')
        toca(cos110)
        dlg = pg.locator("#dlg-eci")
        exp = pg.locator("#eci-exp")
        assert "O problema" in exp.inner_text() and pg.locator(".eci-termo").count() == 0
        toca(pg.locator('[data-acao="ler"]')); pg.wait_for_selector("[data-linha]", timeout=30000)
        assert pg.locator(".linhas-lidas .descartada").filter(has_text="PESSOA DE EXEMPLO").count() >= 1
        assert pg.locator(".linhas-lidas .descartada").filter(has_text="COS242").filter(has_text="fora do formato").count() == 1
        assert pg.locator(".selo-etapa.real").count() >= 3 and pg.locator(".selo-etapa.ilustrativa").count() >= 2
        toca(pg.locator("[data-linha]").filter(has_text="COS110"))
        expect(pg.locator(".eci-termo")).to_contain_text("análise sintática")
        pg.select_option("#ed-sf", "RM")
        assert pg.locator(".previa-periodos li li.mudou").filter(has_text="COS110 · reprovada").count() == 1
        assert pg.locator(".tabela-eci tr.mudou").filter(has_text="COS110").count() == 1 and pg.locator(".linhas-lidas li.mudou").count() == 1
        pg.fill("#ed-grau", "3.5"); pg.locator("#ed-grau").press("Tab")
        assert pg.locator(".previa-periodos li li").filter(has_text="nota 3.5").count() == 1
        pg.locator(".logica summary").click()
        lg = pg.locator(".logica").inner_text(); assert "js/siga.js" in lg and "Caso de borda" in lg and "RE.histLinha" in lg
        foto(pg, f"57-cos110-{nome}")
        pg.click("#eci-voltar")
        expect(dlg).to_be_hidden()
        expect(exp).to_be_empty()
        expect(cos110).to_be_focused()
        # ---- COS242
        cos242 = pg.locator('[data-eci-abrir="COS242"]')
        toca(cos242)
        expect(exp).to_contain_text("MAC128 precisa de MAC118 e libera MAC238")
        ex = pg.locator(".eci-explica").inner_text(); assert "MAC118" in ex and "MAC238" in ex
        assert pg.locator("#eci-grafo svg path.seta").count() >= 6
        toca(pg.locator('[data-no="EEL418"]')); expect(pg.locator(".eci-explica")).to_contain_text("COS231")
        assert "co-requisito" in pg.locator(".eci-explica").inner_text().lower() and pg.locator("#eci-grafo path.seta.coreq").count() == 1
        expect(pg.locator(".eci-termo")).to_contain_text("grafo dirigido")
        toca(pg.locator('[data-no="MAC118"]')); toca(pg.locator('[data-cursar="MAC118"]'))
        expect(pg.locator(".eci-explica")).to_contain_text("Liberadas agora: COS110, MAC128")
        pg.select_option("#sim-de", "MAC238"); pg.select_option("#sim-para", "MAC118"); toca(pg.locator('[data-acao="simular"]'))
        expect(pg.locator(".eci-alerta")).to_contain_text("Ciclo: MAC118 → MAC128 → MAC238 → MAC118")
        assert "indefinida" in pg.locator(".eci-explica").inner_text() and pg.locator("#eci-grafo path.seta.sim").count() == 1
        toca(pg.locator('[data-no="COS231"]')); expect(pg.locator(".eci-explica").get_by_role("heading", name=re.compile("COS231"))).to_contain_text("COS231")   # continua utilizável
        foto(pg, f"58-cos242-ciclo-{nome}")
        toca(pg.locator('[data-acao="limpar-sim"]')); expect(pg.locator(".eci-alerta")).to_have_count(0)
        pg.locator(".logica summary").click(); assert "Caso de borda" in pg.locator(".logica").inner_text()
        pg.keyboard.press("Escape")
        expect(dlg).to_be_hidden()
        expect(exp).to_be_empty()
        expect(cos242).to_be_focused()
        # ---- EEL873
        toca(pg.locator('[data-eci-abrir="EEL873"]'))
        toca(pg.locator('[data-acao="comparar"]')); pg.wait_for_selector('input[name="eci-cenario"]', timeout=30000)
        linhas = pg.locator(".tabela-eci tbody tr")
        assert linhas.nth(0).inner_text().endswith("✓ iguais") and linhas.nth(1).inner_text().endswith("✓ iguais")
        assert "pré-computado" in pg.locator(".lados").inner_text()
        pg.check('input[name="eci-cenario"][value="regra"]')
        assert "✗ diferentes" in linhas.nth(0).inner_text() and pg.locator(".aviso-sim").count() == 1
        expect(pg.locator(".eci-termo")).to_contain_text("teste diferencial")
        pg.check('input[name="eci-cenario"][value="extracao"]')
        assert linhas.nth(0).inner_text().endswith("✓ iguais") and "✗ diferentes" in linhas.nth(1).inner_text()
        pg.check('input[name="eci-cenario"][value="compartilhado"]')
        assert linhas.nth(0).inner_text().endswith("✓ iguais") and linhas.nth(1).inner_text().endswith("✓ iguais")
        assert "COS242" in pg.locator(".eci-explica-txt").inner_text() and pg.locator(".aviso-sim").count() == 0
        assert pg.locator(".selo-sim").count() == 2
        pg.locator(".logica summary").click(); assert "testar_paridade.sh" in pg.locator(".logica").inner_text()
        foto(pg, f"59-eel873-{nome}")
        pg.click("#eci-voltar")
        depois = snapshot(pg)
        mudou = {k for k in set(antes) | set(depois) if antes.get(k) != depois.get(k)}
        assert mudou <= {CHAVE + "vista"}, mudou        # só a aba aberta (navegação); nada das experiências
        ctx.close()

@caso("Experiências com perfil e plano salvos: abrir, usar e fechar não muda perfil, planejamento nem armazenamento")
def t_exp_com_perfil(b):
    ctx, pg = abre(b, perfil=PLANO, extra={"plano": {"periodos": {"2027/2": [{"code": "COS360", "horarios": ["seg 08-10"]}]}, "novos": []},
                                            "marcacoes": {"COS471": "planejada"}, "modoClassico": False, "vista": "grade"}, nome="exp-com-perfil")
    antes = snapshot(pg); exp_antes = pg.evaluate("JSON.stringify(GradeInterativa.perfilExportado())")
    pg.click("#pal-eci")
    pg.locator('.card[data-code="COS110"]').click(); pg.click('[data-acao="ler"]'); pg.wait_for_selector("[data-linha]", timeout=30000)
    pg.locator("[data-linha]").first.click(); pg.select_option("#ed-sf", "RF"); pg.keyboard.press("Escape")
    pg.locator('.card[data-code="COS242"]').click(); pg.locator('[data-no="MAC128"]').click(); pg.click('[data-cursar="MAC128"]')
    pg.click('[data-acao="simular"]'); pg.click("#eci-voltar")
    pg.locator('.card[data-code="EEL873"]').click(); pg.click('[data-acao="comparar"]'); pg.wait_for_selector('input[name="eci-cenario"]')
    pg.check('input[name="eci-cenario"][value="regra"]'); pg.click("#eci-voltar")
    pg.click("#pal-eci")
    assert snapshot(pg) == antes and pg.evaluate("JSON.stringify(GradeInterativa.perfilExportado())") == exp_antes
    pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/2"]'); assert "seg 08-10" in pg.locator(".crono-lista").inner_text()
    ctx.close()

@caso("Fechar uma experiência durante a leitura dos PDFs fictícios não gera erro e a experiência reabre do zero")
def t_fecha_durante_leitura(b):
    ctx, pg = abre(b, extra={"modoClassico": False}, nome="fecha-durante", atalhos=False)
    pg.click('[data-vista="eci"]'); pg.click('[data-eci-abrir="COS110"]')
    pg.click('[data-acao="ler"]'); pg.keyboard.press("Escape"); pg.wait_for_timeout(2500)
    expect(pg.locator("#dlg-eci")).to_be_hidden()
    assert not [e for e in eventos if "[fecha-durante]" in e]
    pg.click('[data-eci-abrir="COS110"]'); expect(pg.locator('[data-acao="ler"]')).to_be_visible()   # estado temporário recomeça
    pg.click('[data-acao="ler"]'); pg.wait_for_selector("[data-linha]", timeout=30000)
    ctx.close()

CASOS3 = [t_fecha_durante_leitura, t_previa_confirmacao, t_previa_download, t_formatos, t_atalhos, t_modo, t_sync, t_seletor_eci, t_experiencias, t_exp_com_perfil]

CASOS = [
    t_descartar_salvo, t_tema, t_tema_abas, t_sem_perfil, t_criar_perfil, t_perfil_conflito,
    t_compat, t_siga, t_siga_sem_boa, t_excluir, t_oferta, t_mac,
    t_cr01_pre, t_cr01_co, t_cr01_sugestoes, t_cr01_proposta, t_cr01_equivalencia, t_cr01_manual,
    t_cr03_historico, t_cr03_lista,
    t_cr04_reingresso, t_cr04_controles, t_cr04_papel, t_cr04_fronteira,
    t_cr02_pedidos, t_cr02_duas_dispensas, t_cr02_dispensa_unica,
    t_d02_dois_numeros, t_d02_ausente_e_vazia, t_d02_outros_grupos, t_d02_importacao,
    t_rf08_faixa, t_rf08_notas_credito, t_rf08_periodo_atual, t_rf08_oferta, t_rf08_rodape, t_rf08_ace,
    t_pc02_manual_credito, t_pc03_manual_requisito,
    t_d01_carga, t_d01_conteudo,
    t_regressao, t_a11y,
] + CASOS2 + CASOS3

def rodar(navegador, url, pasta, fixtures_pdf, filtro=None):
    global URL, OUT, PDFS
    URL, OUT, PDFS = url, pasta, fixtures_pdf
    resultados.clear()
    eventos.clear()
    avisos.clear()
    for cenario in CASOS:
        if filtro and not re.search(filtro, cenario.nome):
            continue
        cenario(navegador)
        for contexto in navegador.contexts:
            contexto.close()
    return list(resultados), list(eventos), list(avisos)
