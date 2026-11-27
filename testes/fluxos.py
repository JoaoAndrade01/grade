"""Cenários de interface portados dos três kits de revisão da Grade."""
import json, pathlib, re, time
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
def pronto(pg, nome):
    """O app inicia de forma assíncrona (em file:// espera a tentativa de carregar perfil/perfil.js) e, de vez em quando,
    o evento load dispara antes (ReferenceError em GradeInterativa, cliques sem efeito). Confere a prontidão logo após o
    load; se ainda não iniciou, registra o atraso em `avisos` (não descarta a ocorrência) e espera de forma dirigida."""
    if pg.evaluate("typeof window.GradeInterativa") == "object": return
    t0 = time.time()
    try:
        pg.wait_for_function("typeof window.GradeInterativa === 'object'", timeout=15000)
    except Exception:
        raise AssertionError("o app não iniciou: " + json.dumps(pg.evaluate("({ readyState: document.readyState, scripts: [...document.scripts].map((s) => s.src.split('/').pop()) })")))
    avisos.append(f"[{nome}] app iniciado {int((time.time() - t0) * 1000)} ms depois do evento load (readyState={pg.evaluate('document.readyState')})")


def abre(b, vp=D, esquema="light", perfil=None, extra=None, nome="", toque=False, atalhos=True, relogio=None, modo="planejador"):
    # Os cenários antigos usam os botões do topo: por padrão, fixa todos os atalhos (atalhos=False = primeira visita real).
    if atalhos: extra = {"atalhos": TODOS_ATALHOS, **(extra or {})}
    # Modo explícito: os cenários abrem no Planejador. Só os do Clássico pedem modo="classico", que é o padrão do app ao
    # abrir (nenhuma chave gravada). Um "modoClassico" em `extra` prevalece.
    if modo == "planejador": extra = {"modoClassico": False, **(extra or {})}
    elif modo != "classico": raise ValueError(f"modo desconhecido: {modo}")
    ctx = b.new_context(viewport=vp, color_scheme=esquema, is_mobile=toque and b.browser_type.name != "firefox", has_touch=toque, accept_downloads=True)
    if relogio: ctx.clock.set_fixed_time(relogio)      # datas que dependem do relógio ficam fixas
    pg = ctx.new_page()
    observa(ctx, URL, nome, eventos, avisos)
    pg.goto(URL); pg.wait_for_load_state("load"); pronto(pg, nome)
    if perfil is not None or extra:
        pg.evaluate("""([p, extra, K]) => { if (p) localStorage.setItem(K + 'perfilImportado', JSON.stringify(p));
                       for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(K + k, JSON.stringify(v)); }""", [perfil, extra, CHAVE])
        pg.reload(); pg.wait_for_load_state("load"); pronto(pg, nome)
    return ctx, pg


def foto(pg, nome, full=False): pg.wait_for_timeout(150); pg.screenshot(path=str(OUT / f"{nome}.png"), full_page=full)
def ls(pg, k): return pg.evaluate("k => JSON.parse(localStorage.getItem(k))", CHAVE + k)
def aceso(loc): return loc.get_attribute("aria-pressed") == "true"   # botões que acendem (Exibir, filtros)
def trilha(pg, v): return pg.locator(f'#ferramentas .seletor-trilha input[name="trilha"][value="{v}"]')   # chave segmentada da Trilha
def escolhe_trilha(pg, v): pg.locator(f'#ferramentas .seletor-trilha label:has(input[value="{v}"])').click()
def alterna_modo(pg):
    """Seletor Clássico | Planejador do topo: escolhe a opção que não está marcada."""
    pg.locator("#seletor-modo label:has(input:not(:checked))").click()
def completo(pg, vista=None):
    if pg.locator("#modo-classico").is_checked(): alterna_modo(pg)
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
@caso("Primeira visita sem perfil: grade clássica só com o seletor e o tema no topo; Planejador com Criar perfil e Importar; sem nome nem progresso, aba 'Grade ECI'")
def t_sem_perfil(b):
    ctx, pg = abre(b, nome="sem-perfil", atalhos=False, modo="classico")
    assert pg.locator("#modo-classico").is_checked()
    assert pg.title() == "Grade ECI"
    assert pg.evaluate("document.querySelector('link[rel=icon]').getAttribute('href')") == "static/logo-gremio-eci.png"
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI"
    assert pg.locator("#barra-geral").is_hidden() and pg.locator("#progresso").is_hidden()
    assert pg.locator(".col-topo .chip").count() == 0
    # Clássico (só pintar): no topo, só o seletor de modo e o tema
    expect(pg.locator("#seletor-modo")).to_be_visible(); expect(pg.locator("#btn-tema")).to_be_visible()
    expect(pg.locator("#btn-config")).to_be_hidden(); expect(pg.locator("#btn-foco")).to_be_hidden()
    assert pg.locator("#btn-importar, #btn-perfil, #btn-privacidade, #btn-referencias, #btn-tags").count() == 0
    expect(pg.get_by_role("button", name="Criar perfil", exact=True)).to_have_count(0)
    logo = pg.locator(".logo").evaluate("i => [i.naturalWidth, i.naturalHeight, i.getBoundingClientRect().width, i.getBoundingClientRect().height, i.alt]")
    assert logo[0] == 200 and abs(logo[2] - logo[3]) < 0.5 and logo[4], logo
    pg.locator("#modo-classico").focus(); pg.keyboard.press("ArrowRight")     # rádios: a seta escolhe o Planejador
    assert not pg.locator("#modo-classico").is_checked() and pg.locator(".abas").is_visible()
    # Planejador: sem perfil, "Importar do SIGA" e "Criar perfil" aparecem; os outros atalhos começam desafixados
    assert pg.locator("#btn-importar .rot").is_visible() and pg.locator("#btn-perfil .rot").is_visible()
    expect(pg.get_by_role("button", name="Criar perfil", exact=True)).to_be_visible(); expect(pg.locator("#btn-config")).to_be_visible()
    assert pg.locator("#btn-tema, #btn-privacidade, #btn-referencias, #btn-tags").count() == 0
    pg.click('[data-vista="timeline"]'); assert "Criar perfil" in pg.locator(".sem-perfil").inner_text()
    foto(pg, "11-sem-perfil-modo-completo-linha-do-tempo")
    ctx.close()

@caso("Seletor Clássico | Planejador no topo: setas do teclado, nomes acessíveis; Aparência 'Só ícones' preserva o nome; Configurações diz Planejador")
def t_seletor_modo(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="seletor-modo", modo="classico")
    sel = pg.locator("#seletor-modo"); expect(sel).to_be_visible()
    assert sel.get_attribute("role") == "radiogroup" and sel.inner_text().split() == ["Clássico", "Planejador"], sel.inner_text()
    classico, planejador = pg.get_by_role("radio", name="Clássico"), pg.get_by_role("radio", name="Planejador")
    expect(classico).to_be_checked(); expect(planejador).not_to_be_checked()
    classico.focus(); pg.keyboard.press("ArrowRight")
    expect(planejador).to_be_checked(); expect(pg.locator(".abas")).to_be_visible(); assert ls(pg, "modoClassico") is False
    assert pg.evaluate("document.activeElement.id") == "modo-planejador"
    assert pg.evaluate("getComputedStyle(document.activeElement.closest('label')).outlineStyle") != "none"   # foco visível no rótulo
    pg.keyboard.press("ArrowLeft"); expect(classico).to_be_checked(); expect(pg.locator(".abas")).to_be_hidden()
    pg.locator("#seletor-modo label:has(#modo-planejador)").click(); expect(planejador).to_be_checked()
    pg.click("#btn-config")
    texto = pg.locator("#dlg-config").inner_text()
    assert "Planejador: com as abas" in texto and "Completo" not in texto, texto
    assert pg.locator("#cfg-seletor-icones").count() == 0                     # a opção antiga virou o nível Só ícones
    pg.check('#dlg-config input[name="aparencia"][value="icone"]'); pg.keyboard.press("Escape")
    assert ls(pg, "aparencia") == "icone" and ls(pg, "seletorIcones") is None
    pg.reload(); pg.wait_for_load_state("load"); pronto(pg, "seletor-modo")
    rotulos = pg.evaluate("[...document.querySelectorAll('#seletor-modo .rot')].map((r) => r.getBoundingClientRect().width)")
    icones = pg.evaluate("[...document.querySelectorAll('#seletor-modo .ico')].map((r) => r.getBoundingClientRect().width)")
    assert all(w <= 1 for w in rotulos) and len(icones) == 2 and all(w >= 12 for w in icones), (rotulos, icones)
    expect(pg.get_by_role("radio", name="Planejador")).to_be_checked(); expect(pg.get_by_role("radio", name="Clássico")).to_have_count(1)
    foto(pg, "seletor-modo-so-icones")
    ctx.close()

@caso("Importar fica no Planejador: o Clássico não tem Importar nem a sugestão de trocar de modo; no Planejador, o importador abre sem sugestão")
def t_importar_sugere_planejador(b):
    ctx, pg = abre(b, nome="importar-sugere", modo="classico")
    assert pg.locator("#btn-importar, #sugere-planejador, #ir-planejador").count() == 0
    alterna_modo(pg); pg.click("#btn-importar")
    expect(pg.locator("#siga-pdfs")).to_be_visible(); assert pg.locator("#sugere-planejador, #ir-planejador").count() == 0
    pg.keyboard.press("Escape"); alterna_modo(pg)                                   # voltar ao Clássico fecha o painel
    expect(pg.locator("#detalhes")).to_be_hidden(); assert pg.locator("#btn-importar").count() == 0
    ctx.close()

# ------------------------------------------------------------------ criar perfil
@caso("Criar perfil com campos vazios preserva marcações; editar com nome e semestre; validação e conflito")
def t_criar_perfil(b):
    ctx, pg = abre(b, nome="criar-perfil", modo="classico")
    pg.locator('.card[data-code="COS110"]').click()           # pinta com a tag padrão (Aprovada)
    assert ls(pg, "marcacoes") == {"COS110": "aprovada"}
    assert pg.locator("#btn-perfil").count() == 0; alterna_modo(pg)   # criar perfil é no Planejador
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
    pg.click("#btn-perfil"); pg.fill("#perfil-nome", "Beatriz"); pg.fill("#perfil-semestre", "2026/3"); pg.press("#perfil-semestre", "Enter")
    expect(dlg).to_be_visible(); expect(pg.locator("#perfil-semestre")).to_have_attribute("aria-invalid", "true")
    assert "AAAA/1" in pg.locator("#perfil-semestre-msg").inner_text()
    foto(pg, "13-dialogo-perfil-semestre-invalido")
    pg.fill("#perfil-semestre", "2026/2"); pg.press("#perfil-nome", "Enter")   # Enter salva (não cancela)
    expect(dlg).to_be_hidden()
    assert pg.locator("#titulo").inner_text().strip() == "Grade ECI — Beatriz", pg.locator("#titulo").inner_text()
    assert pg.title() == "Grade ECI"
    p = ls(pg, "perfilImportado"); assert p["nome"] == "Beatriz" and p["periodos"][0] == {"nome": "2026/2", "atual": True, "disciplinas": []}, p
    foto(pg, "14-perfil-criado-com-nome")
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
def centro_da_janela(pg, sel):
    r = pg.locator(sel).bounding_box(); v = pg.viewport_size
    return abs(r["x"] + r["width"] / 2 - v["width"] / 2) < 30 and abs(r["y"] + r["height"] / 2 - v["height"] / 2) < 60

@caso("Configurações: fecha pelo X no topo, por clique fora e por Esc; o foco volta ao botão que abriu")
def t_config_fechar(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="config-fechar")
    observado = {}
    for jeito in ("x-mouse", "x-teclado", "fora", "esc"):
        pg.focus("#btn-config"); pg.keyboard.press("Enter")
        dlg = pg.locator("#dlg-config"); expect(dlg).to_be_visible()
        x = pg.locator("#dlg-config .dlg-x")
        assert x.get_attribute("aria-label") == "Fechar Configurações"
        if jeito == "x-mouse":
            r = dlg.bounding_box(); pg.mouse.click(r["x"] + 6, r["y"] + r["height"] - 6)     # clique dentro (borda interna) não fecha
            expect(dlg).to_be_visible()
            assert x.bounding_box()["y"] - r["y"] < 40, "o X fica no topo"
            x.click()
        elif jeito == "x-teclado":
            pg.keyboard.press("Shift+Tab")
            for _ in range(40):
                if pg.evaluate("document.activeElement.classList.contains('dlg-x')"): break
                pg.keyboard.press("Tab")
            pg.keyboard.press("Enter")
        elif jeito == "fora":
            pg.mouse.click(8, pg.viewport_size["height"] - 8)
        else:
            pg.keyboard.press("Escape")
        try: expect(dlg).to_be_hidden()
        except AssertionError: raise AssertionError(f"{jeito}: Configurações continua aberta; foco em {descreve_foco(pg)}")
        observado[jeito] = pg.evaluate("document.activeElement.id")
    # aberta pelo mouse: no WebKit o clique não foca o botão; o foco volta a ele mesmo assim
    for jeito in ("clique-x", "clique-fora", "clique-esc"):
        pg.click("#btn-config"); dlg = pg.locator("#dlg-config"); expect(dlg).to_be_visible()
        if jeito == "clique-x": pg.locator("#dlg-config .dlg-x").click()
        elif jeito == "clique-fora": pg.mouse.click(8, pg.viewport_size["height"] - 8)
        else: pg.keyboard.press("Escape")
        expect(dlg).to_be_hidden()
        observado[jeito] = pg.evaluate("document.activeElement.id")
    ctx.close()
    assert observado == {"x-mouse": "btn-config", "x-teclado": "btn-config", "fora": "btn-config", "esc": "btn-config",
                         "clique-x": "btn-config", "clique-fora": "btn-config", "clique-esc": "btn-config"}, observado

@caso("Períodos: Adicionar e Excluir usam a mesma janela central; validação, teclado e foco")
def t_periodo_janela(b):
    for vp in (D, C):
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, nome=f"periodo-janela-{vp['width']}")
        completo(pg, "cronograma")
        pg.locator("#novo-periodo").press("Enter")
        dlg = pg.locator("#dlg-periodo"); expect(dlg).to_be_visible()
        assert centro_da_janela(pg, "#dlg-periodo"), dlg.bounding_box()
        assert pg.evaluate("document.activeElement.id") == "periodo-nome"
        assert pg.locator("#periodo-nome").input_value() == "2028/1"                 # sugestão: o semestre seguinte ao último
        pg.keyboard.press("Escape"); expect(dlg).to_be_hidden()
        assert pg.evaluate("document.activeElement.id") == "novo-periodo"
        assert pg.locator('[data-cperiodo="2028/1"]').count() == 0
        pg.click("#novo-periodo"); pg.fill("#periodo-nome", "2027/1"); pg.press("#periodo-nome", "Enter")
        expect(dlg).to_be_visible(); expect(pg.locator("#periodo-msg")).to_contain_text("já existe")
        assert pg.locator("#periodo-nome").get_attribute("aria-invalid") == "true"
        pg.fill("#periodo-nome", "  "); pg.click("#periodo-ok"); expect(pg.locator("#periodo-msg")).to_contain_text("Informe")
        pg.fill("#periodo-nome", "2028/1"); pg.press("#periodo-nome", "Enter"); expect(dlg).to_be_hidden()
        expect(pg.locator('[data-cperiodo="2028/1"]')).to_have_attribute("aria-pressed", "true")
        assert pg.evaluate("document.activeElement.dataset.cperiodo") == "2028/1"
        if vp is D: foto(pg, "periodo-adicionado")
        pg.locator("#excluir-periodo").press("Enter")
        expect(pg.locator("#dlg-confirma")).to_be_visible()
        assert centro_da_janela(pg, "#dlg-confirma"), pg.locator("#dlg-confirma").bounding_box()
        pg.keyboard.press("Escape"); expect(pg.locator("#excluir-periodo")).to_be_focused()
        ctx.close()

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
    expect(pg.locator('[data-cperiodo="2027/2"]')).to_have_attribute("aria-pressed", "true")
    assert pg.evaluate("document.activeElement.dataset.cperiodo") == "2027/2"
    pg.reload(); pg.wait_for_load_state("load")
    assert pg.locator('[data-cperiodo="2027/1"]').count() == 0 and ls(pg, "plano")["removidos"] == ["2027/1"]
    with pg.expect_download() as d: pg.click("#exportar")
    exp = pathlib.Path(d.value.path()).read_text(encoding="utf-8"); assert '"nome":"2027/1"' not in exp and '"nome":"2027/2"' in exp
    # período local novo
    pg.click("#novo-periodo"); pg.fill("#periodo-nome", "2028/1"); pg.press("#periodo-nome", "Enter")
    expect(pg.locator('[data-cperiodo="2028/1"]')).to_have_attribute("aria-pressed", "true")
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

@caso("CR-05: transferida cumpre requisito pelo semestre original; sem ele, só depois do ano do bloco")
def t_cr05_transferida_requisito(b):
    def avisos_de(periodos, consultas, nome):
        ctx, pg = abre(b, perfil={"periodos": periodos}, nome=nome)
        r = {(c, p): pg.evaluate("([c, p]) => window.GradeInterativa.avisos(c, p)", [c, p]) for c in consultas for p in consultas[c]}
        return ctx, pg, r
    tem = lambda lista, req: any(req in x for x in lista)
    observado = {}
    # Com semestre original (aprovadaEm 2020/2): MAC238 cursando em 2026/2 não recebe aviso de MAC128.
    ctx, pg, r = avisos_de([
        {"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC118", "aprovadaEm": "2020/1"}, {"code": "MAC128", "aprovadaEm": "2020/2"}]},
        {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]},
    ], {"MAC238": ["2026/2"]}, "cr05-original")
    observado["original"] = tem(r["MAC238", "2026/2"], "Requisito MAC128")
    completo(pg, "timeline")
    observado["original-card"] = "Requisito MAC128 não cumprido" in pg.locator('.card[data-code="MAC238"]').get_attribute("title")
    ctx.close()
    # Ordem pelo semestre original: aprovada em 2026/1 não cumpre pré-requisito no próprio 2026/1.
    ctx, pg, r = avisos_de([
        {"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC128", "aprovadaEm": "2026/1"}]},
        {"nome": "2026/1", "planejado": True, "disciplinas": ["MAC238"]},
        {"nome": "2026/2", "planejado": True, "disciplinas": []},
    ], {"MAC238": ["2026/1", "2026/2"]}, "cr05-ordem")
    observado["ordem-mesmo"] = tem(r["MAC238", "2026/1"], "Requisito MAC128")
    observado["ordem-depois"] = tem(r["MAC238", "2026/2"], "Requisito MAC128")
    ctx.close()
    # Sem semestre original: conta só a partir do ano seguinte ao do bloco (AAAA (transferidas) e AAAA/0).
    for bloco in ("2025 (transferidas)", "2025/0"):
        ctx, pg, r = avisos_de([
            {"nome": bloco, "disciplinas": ["MAC128"]},
            {"nome": "2025/2", "planejado": True, "disciplinas": ["MAC238"]},
            {"nome": "2026/1", "planejado": True, "disciplinas": []},
        ], {"MAC238": ["2025/2", "2026/1"]}, f"cr05-sem-original-{bloco[:4]}{bloco[4:6].strip()}")
        observado[bloco, "mesmo-ano"] = tem(r["MAC238", "2025/2"], "Requisito MAC128")
        observado[bloco, "ano-seguinte"] = tem(r["MAC238", "2026/1"], "Requisito MAC128")
        ctx.close()
    # Co-requisito: COS231 transferida sem data aceita EEL418 só no ano seguinte; com data, aceita o mesmo semestre.
    ctx, pg, r = avisos_de([
        {"nome": "2025 (transferidas)", "disciplinas": ["COS231"]},
        {"nome": "2025/2", "planejado": True, "disciplinas": ["EEL418"]},
        {"nome": "2026/1", "planejado": True, "disciplinas": []},
    ], {"EEL418": ["2025/2", "2026/1"]}, "cr05-co-sem-original")
    observado["co-mesmo-ano"] = tem(r["EEL418", "2025/2"], "Co-requisito COS231")
    observado["co-ano-seguinte"] = tem(r["EEL418", "2026/1"], "Co-requisito COS231")
    ctx.close()
    ctx, pg, r = avisos_de([
        {"nome": "2026 (transferidas)", "disciplinas": [{"code": "COS231", "aprovadaEm": "2026/1"}]},
        {"nome": "2026/1", "planejado": True, "disciplinas": ["EEL418"]},
    ], {"EEL418": ["2026/1"]}, "cr05-co-original")
    observado["co-original-mesmo-semestre"] = tem(r["EEL418", "2026/1"], "Co-requisito COS231")
    ctx.close()
    # Dois históricos (importação): MAC118 vai para o bloco de 2025 com aprovadaEm 2020/1 e cumpre MAC128 em 2020/2.
    ctx, pg = importa_cenario(b, "reingresso-antigo-atual", "cr05-dois-historicos")
    pg.click("#siga-usar")
    observado["dois-historicos"] = tem(pg.evaluate("window.GradeInterativa.avisos('MAC128', '2020/2')"), "Requisito MAC118")
    ctx.close()
    assert observado == {
        "original": False, "original-card": False, "ordem-mesmo": True, "ordem-depois": False,
        ("2025 (transferidas)", "mesmo-ano"): True, ("2025 (transferidas)", "ano-seguinte"): False,
        ("2025/0", "mesmo-ano"): True, ("2025/0", "ano-seguinte"): False,
        "co-mesmo-ano": True, "co-ano-seguinte": False, "co-original-mesmo-semestre": False,
        "dois-historicos": False,
    }, observado

@caso("Linha do tempo: 'detalhes' recolhe e expande; clique no cartão abre os detalhes mesmo com pincel escolhido na Grade")
def t_timeline_detalhes_e_clique(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="timeline-detalhes")
    completo(pg, "timeline")
    observado = {"inicial": pg.locator("#progresso").is_visible()}
    pg.click("#bg-detalhes"); observado["aberto"] = pg.locator("#progresso").is_visible()
    pg.click("#bg-detalhes"); observado["fechado"] = pg.locator("#progresso").is_visible()
    # Pincel escolhido na Grade não pinta (nem manda para "A alocar") na linha do tempo: o clique abre os detalhes.
    pg.click('[data-vista="grade"]'); pg.click('#paleta [data-pincel="planejada"]')
    pg.click('[data-vista="timeline"]')
    codigo = pg.locator("#painel .col-cursado .card[data-code]").first.get_attribute("data-code")
    antes = ls(pg, "marcacoes")
    pg.locator(f'#painel .col-cursado .card[data-code="{codigo}"]').first.click()
    observado["detalhes"] = pg.locator("#detalhes").is_visible()
    observado["marcacoes-iguais"] = ls(pg, "marcacoes") == antes
    observado["fora-de-alocar"] = pg.locator(f'#painel .col-alocar .card[data-code="{codigo}"]').count() == 0
    ctx.close()
    assert observado == {"inicial": False, "aberto": True, "fechado": False, "detalhes": True,
                         "marcacoes-iguais": True, "fora-de-alocar": True}, observado

@caso("Linha do tempo: transferida aparece no semestre original, com etiqueta; sem ele, fica no bloco; prazo e contagens iguais")
def t_timeline_transferidas(b):
    def colunas(pg):
        return pg.evaluate("""() => [...document.querySelectorAll('#painel .coluna')].map((c) => [c.querySelector('h2').textContent,
            [...c.querySelectorAll('.card[data-code]')].map((k) => k.dataset.code + (k.classList.contains('transferida') ? '*' : ''))])""")
    def perfil(com_original):
        bloco = [{"code": "MAC118", "nota": 7, **({"aprovadaEm": "2020/1"} if com_original else {})},
                 {"code": "MAC128", "nota": 7, **({"aprovadaEm": "2020/2"} if com_original else {})}, {"code": "COS111", "nota": 8}]
        return {"periodos": [{"nome": "2020/2", "disciplinas": [{"code": "FIS111", "nota": 7}]},
                             {"nome": "2025 (transferidas)", "disciplinas": bloco},
                             {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]}],
                "equivalencias": [{"cursadas": ["MAC118"], "pedida": "COC602", "status": "a pedir"}]}
    vistos = {}
    for com_original in (True, False):
        ctx, pg = abre(b, perfil=perfil(com_original), nome=f"timeline-transferidas-{com_original}", relogio=RELOGIO)
        completo(pg, "timeline")
        cols = colunas(pg)
        if com_original:
            assert [c[0] for c in cols][:4] == ["2020/1", "2020/2", "2025 (transferidas)", "2026/2"], cols
            assert cols[0][1] == ["MAC118*"] and cols[1][1] == ["FIS111", "MAC128*"] and cols[2][1] == ["COS111"], cols
            card = pg.locator('#painel .card.transferida[data-code="MAC118"]')
            expect(card).to_contain_text("transferida")
            assert "transferida" in card.get_attribute("title"), card.get_attribute("title")
            foto(pg, "timeline-transferidas")
        else:
            assert [c[0] for c in cols][:3] == ["2020/2", "2025 (transferidas)", "2026/2"], cols
            assert cols[1][1] == ["MAC118", "MAC128", "COS111"], cols
        totais = pg.evaluate("JSON.stringify(GradeInterativa.totais())")
        completo(pg, "pedidos")
        linha = pg.locator('.pedidos tr[class^="eq-"]').first.inner_text()
        assert "2025" in linha, linha                                              # prazo pelo ano do bloco (D-03)
        vistos[com_original] = totais
        ctx.close()
    assert vistos[True] == vistos[False]

@caso("Linha do tempo: bloco de transferidas vazio some da tela; prazo pelo ano do bloco (D-03) e requisitos (D-08) não mudam")
def t_timeline_bloco_vazio(b):
    def titulos(pg):
        return pg.evaluate("""() => [...document.querySelectorAll('#painel .coluna')].map((c) => [c.querySelector('h2').textContent,
            [...c.querySelectorAll('.card[data-code]')].map((k) => k.dataset.code)])""")
    observado = {}
    # Todas as transferidas têm semestre original: a coluna do bloco fica vazia e some.
    todas = {"periodos": [
        {"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC118", "nota": 7, "aprovadaEm": "2020/1"},
                                                        {"code": "MAC128", "nota": 7, "aprovadaEm": "2020/2"}]},
        {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]}],
        "equivalencias": [{"cursadas": ["MAC118"], "pedida": "COC602", "status": "a pedir"}]}
    ctx, pg = abre(b, perfil=todas, nome="timeline-bloco-vazio", relogio=RELOGIO)
    completo(pg, "timeline")
    cols = titulos(pg)
    observado["colunas"] = [c[0] for c in cols if c[0] != "A alocar"]
    observado["requisito"] = any("Requisito MAC128" in x for x in pg.evaluate("GradeInterativa.avisos('MAC238', '2026/2')"))
    observado["aviso-card"] = "Requisito MAC128" in (pg.locator('.card[data-code="MAC238"]').first.get_attribute("title") or "")
    foto(pg, "timeline-bloco-vazio")
    completo(pg, "pedidos")
    observado["prazo"] = "Base do prazo: só o ano 2025 (bloco de transferidos)." in pg.locator("#painel").inner_text()
    ctx.close()
    # Uma transferida sem semestre original: o bloco aparece só com ela.
    uma = {"periodos": [
        {"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC118", "nota": 7, "aprovadaEm": "2020/1"}, {"code": "COS111", "nota": 8}]},
        {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]}]}
    ctx, pg = abre(b, perfil=uma, nome="timeline-bloco-uma", relogio=RELOGIO)
    completo(pg, "timeline")
    observado["uma"] = [c for c in titulos(pg) if c[0] in ("2020/1", "2025 (transferidas)")]
    ctx.close()
    assert observado == {"colunas": ["2020/1", "2020/2", "2026/2"], "requisito": False, "aviso-card": False, "prazo": True,
                         "uma": [["2020/1", ["MAC118"]], ["2025 (transferidas)", ["COS111"]]]}, observado

@caso("Rodapé: 'versão antiga' leva à Grade do Grêmio publicada; classico.html continua abrindo o modo clássico")
def t_versao_antiga(b):
    ctx, pg = abre(b, nome="versao-antiga", modo="classico")
    alterna_modo(pg)
    link = pg.locator(".rodape a", has_text="versão antiga")
    assert link.get_attribute("href") == "https://gremio-eci.github.io/grade/", link.get_attribute("href")
    assert link.get_attribute("target") == "_blank" and "noopener" in (link.get_attribute("rel") or "")
    pg.goto(URL.replace("index.html", "") + "classico.html"); pg.wait_for_url(re.compile(r"index\.html\?modo=classico$")); pronto(pg, "versao-antiga")
    expect(pg.locator("#modo-classico")).to_be_checked()
    ctx.close()

def cartao_na_coluna(pg, periodo, code):
    return pg.locator(f'#painel .coluna:has(> header h2:text-is("{periodo}")) .card[data-code="{code}"]')

@caso("Linha do tempo: cada ocorrência diz situação e origem no nome acessível; clique, toque e Enter abrem os detalhes dessa ocorrência")
def t_timeline_ocorrencia(b):
    # MAC118 reprovada em 2025/1 e com aprovação prevista em 2026/2 (perfil fictício).
    esperado = {"2025/1": "Reprovada · perfil", "2026/2": "Aprovação prevista · perfil"}
    def ocorrencia(pg):
        det = pg.locator("#detalhes")
        expect(det).to_be_visible()
        primeiro = det.locator(".det-ocorrencia")
        ordem = det.evaluate("""(d) => { const o = d.querySelector('.det-ocorrencia'), s = d.querySelector('.det-status');
            return !!o && !!s && !!(o.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); }""")
        texto = primeiro.inner_text() if primeiro.count() else ""
        pg.keyboard.press("Escape")
        return texto, ordem
    observado = {}
    for nome, vp, toque in (("desktop", D, False), ("celular", C, True)):
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, extra={"modoClassico": False, "vista": "timeline"}, nome=f"timeline-ocorrencia-{nome}", toque=toque)
        for periodo, texto in esperado.items():
            card = cartao_na_coluna(pg, periodo, "MAC118")
            nomeac = card.evaluate("(c) => c.querySelector('.sr') ? c.querySelector('.sr').textContent : ''")
            observado[nome, periodo, "nome"] = nomeac
            card.scroll_into_view_if_needed()
            if toque: card.tap()
            else: card.click()
            observado[nome, periodo, "clique"] = ocorrencia(pg)
            if not toque:
                card.focus(); pg.keyboard.press("Enter")
                observado[nome, periodo, "enter"] = ocorrencia(pg)
        ctx.close()
    for (nome, periodo, via), v in observado.items():
        if via == "nome":
            assert v == f"Cálculo I, {esperado[periodo]}", (nome, periodo, v)
        else:
            texto, ordem = v
            assert texto.startswith(periodo) and esperado[periodo] in texto and ordem, (nome, periodo, via, v)

@caso("Linha do tempo: aprovação transferida e reprovação do mesmo código no mesmo semestre abrem cada uma os próprios detalhes")
def t_timeline_ocorrencia_mesma_coluna(b):
    # MAC128 reprovada em 2020/2 no histórico atual e aprovada no curso anterior em 2020/2 (bloco de 2025, aprovadaEm).
    perfil = {"periodos": [
        {"nome": "2020/2", "disciplinas": [{"code": "MAC128", "status": "reprovado", "nota": 3}]},
        {"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC128", "nota": 7, "aprovadaEm": "2020/2"}]},
        {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]}]}
    esperado = {"reprovada": "2020/2: Reprovada · perfil · nota 3", "transferida": "2020/2: Aprovada · perfil · nota 7 (transferida, 2025 (transferidas))"}
    def detalhe(pg):
        det = pg.locator("#detalhes .det-ocorrencia"); expect(det).to_be_visible()
        t = det.inner_text(); pg.keyboard.press("Escape"); return t
    observado = {}
    for nome, vp, toque in (("desktop", D, False), ("celular", C, True)):
        ctx, pg = abre(b, vp=vp, perfil=perfil, extra={"modoClassico": False, "vista": "timeline"}, nome=f"timeline-mesma-coluna-{nome}", toque=toque, relogio=RELOGIO)
        cards = cartao_na_coluna(pg, "2020/2", "MAC128")
        assert cards.count() == 2, cards.count()
        for rotulo, card in (("reprovada", pg.locator('#painel .coluna:has(> header h2:text-is("2020/2")) .card[data-code="MAC128"]:not(.transferida)')),
                             ("transferida", pg.locator('#painel .coluna:has(> header h2:text-is("2020/2")) .card.transferida[data-code="MAC128"]'))):
            card.scroll_into_view_if_needed()
            if toque: card.tap()
            else: card.click()
            observado[nome, rotulo, "clique"] = detalhe(pg)
            if not toque:
                card.focus(); pg.keyboard.press("Enter")
                observado[nome, rotulo, "enter"] = detalhe(pg)
        ctx.close()
    erros = {k: v for k, v in observado.items() if v != esperado[k[1]]}
    assert not erros and len(observado) == 6, observado

@caso("Linha do tempo: com os detalhes abertos, remover, mover ou planejar antes atualiza ou retira a linha da ocorrência, sem dado de outra")
def t_timeline_ocorrencia_edicao(b):
    def cenario(nome, periodos, abrir, cliques):
        perfil = {"periodos": [{"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC238", "status": "cursando"}]}]
                  + [{"nome": n, "planejado": True, "disciplinas": d} for n, d in periodos]}
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "timeline"}, nome=f"ocorrencia-edicao-{nome}", relogio=RELOGIO)
        cartao_na_coluna(pg, abrir, "MAC118").click()
        antes = pg.locator("#detalhes .det-ocorrencia").inner_text()
        for c in cliques: pg.click(f'#detalhes [data-plan="{c}"]')
        linha = pg.locator("#detalhes .det-ocorrencia")
        depois = linha.inner_text() if linha.count() else None
        ctx.close()
        return antes, depois
    observado = {
        "remover": cenario("remover", [("2027/1", ["MAC118"]), ("2027/2", ["MAC118"])], "2027/1", ["2027/1"]),
        "mover": cenario("mover", [("2027/1", ["MAC118"]), ("2027/2", [])], "2027/1", ["2027/1", "2027/2"]),
        "planejar-antes": cenario("planejar-antes", [("2027/1", []), ("2027/2", ["MAC118"])], "2027/2", ["2027/1"]),
    }
    assert observado == {
        "remover": ("2027/1: Planejada · perfil", None),
        "mover": ("2027/1: Planejada · perfil", None),
        "planejar-antes": ("2027/2: Planejada · perfil", "2027/2: Planejada · perfil"),
    }, observado

@caso("Cartões: nome acessível sem espaço antes da vírgula, na Grade e na Linha do tempo")
def t_nome_sem_espaco(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="nome-sem-espaco")
    expect(pg.locator('#painel .card[data-code="COS110"]')).to_have_accessible_name(re.compile(r"Algoritmos e Programação, Aprovada · perfil"))
    completo(pg, "timeline")
    expect(cartao_na_coluna(pg, "2025/1", "COS110")).to_have_accessible_name(re.compile(r"Algoritmos e Programação, Aprovada · perfil"))
    ctx.close()

ACE_REPETIDA = {"code": "ACE901", "name": "Atividade fictícia repetida", "category": 5, "horas": 30}
@caso("Linha do tempo: cada transferida vai ao próprio semestre original; transferida aprovada não recebe alerta na coluna de destino")
def t_timeline_transferida_origem(b):
    perfil = {"periodos": [
        {"nome": "2025 (transferidas)", "disciplinas": [
            {**ACE_REPETIDA, "nota": 9, "aprovadaEm": "2020/1"}, {**ACE_REPETIDA, "nota": 10, "aprovadaEm": "2021/1"},
            {"code": "MAC238", "nota": 7, "aprovadaEm": "2025/1"}, {"code": "EEL418", "nota": 7, "aprovadaEm": "2027/1"}]},
        {"nome": "2025/1", "atual": True, "disciplinas": [{"code": "FIT112", "status": "cursando"}]},
        {"nome": "2027/1", "planejado": True, "disciplinas": []}]}
    ctx, pg = abre(b, perfil=perfil, nome="timeline-transferida-origem", relogio=RELOGIO)
    completo(pg, "timeline")
    cols = pg.evaluate("""() => [...document.querySelectorAll('#painel .coluna')].map((c) => [c.querySelector('h2').textContent,
        [...c.querySelectorAll('.card[data-code]')].map((k) => k.dataset.code + '|' + (k.querySelector('.nota') || {}).textContent + '|' + k.classList.contains('tem-aviso') + '|' + /Requisito|Co-requisito|ofert/i.test(k.title))])""")
    por = {nome: cards for nome, cards in cols}
    assert por.get("2020/1") == ["ACE901|9.0|false|false"] and por.get("2021/1") == ["ACE901|10.0|false|false"], cols
    assert "MAC238|7.0|false|false" in por.get("2025/1", []), cols                     # coluna do período atual: sem alerta
    assert "EEL418|7.0|false|false" in por.get("2027/1", []), cols                     # coluna planejada: sem requisito nem oferta
    ctx.close()

@caso("ECI por trás ligada: na Linha do tempo, clique e Enter num cartão abrem os detalhes, não a experiência")
def t_eci_timeline(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="eci-timeline")
    completo(pg, "grade"); pg.click("#pal-eci"); expect(pg.locator("#pal-eci")).to_have_attribute("aria-pressed", "true")
    pg.click('[data-vista="timeline"]')
    card = pg.locator('#painel .card[data-code="COS110"]').first
    card.click()
    expect(pg.locator("#detalhes")).to_be_visible(); assert pg.locator("#dlg-eci[open]").count() == 0
    pg.keyboard.press("Escape"); card.focus(); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes")).to_be_visible(); assert pg.locator("#dlg-eci[open]").count() == 0
    pg.keyboard.press("Escape"); pg.click('[data-vista="grade"]')                       # na Grade, continua abrindo a experiência
    if pg.locator("#pal-eci").get_attribute("aria-pressed") != "true": pg.click("#pal-eci")
    pg.locator('#painel .card[data-code="COS110"]').click(); expect(pg.locator("#dlg-eci")).to_be_visible()
    ctx.close()

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
    legenda = legenda_do_progresso(pg)                             # PC-02/03: a identificação fica no detalhamento
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
        pg_barra[nome] = pg.locator("#barra-geral .bg-total").inner_text()
        pg.click('[data-vista="pedidos"]')
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

@caso("CR-04: o prazo não depende da ordem dos arquivos (bloco de 2019 e 2020/1 no anterior, bloco de 2025 no atual)")
def t_cr04_ordem_dos_arquivos(b):
    linhas = []
    for cenario in ("prazo-ordem-ab", "prazo-ordem-ba"):
        ctx, pg = importa_cenario(b, cenario, f"cr04-{cenario}")
        perfil, linha = aplica_e_le_pedido(pg)
        confere_oraculo(perfil, cenario)
        assert "2025" in linha and "2020/1" in linha and "2019" not in linha, (cenario, linha)
        linhas.append(linha)
        ctx.close()
    assert linhas[0] == linhas[1], linhas

@caso("CR-04: duas ocorrências distintas de ACE (2020/1 e 2021/1) somam 60 h com o bloco de 2025 no outro histórico")
def t_cr04_ace_duas_ocorrencias(b):
    for cenario in ("ace-ab", "ace-ba"):
        ctx, pg = importa_cenario(b, cenario, f"cr04-{cenario}")
        perfil, _ = aplica_e_le_pedido(pg)
        confere_oraculo(perfil, cenario)
        horas = horas_ace(pg)
        # 60 h no total: 30 h do semestre 2021/1 e 30 h do bloco de 2025, que não tem semestre e fica "a confirmar" (regra de CR-03)
        assert horas == [30, 30, 0] and sum(horas) == 60, (cenario, horas)
        ctx.close()

@caso("PC-05: perfil antigo com historicoAtual 'duvida' mostra o aviso de estimativa junto do prazo; os demais não")
def t_pc05_perfil_antigo_duvida(b):
    AVISO = "Estimativa: o histórico do curso atual não foi confirmado."
    for fonte, com_aviso in (({"historicoAtual": "duvida"}, True), ({"historicoAtual": "escolhido"}, False), ({}, False)):
        perfil = {"periodos": [{"nome": "2025 (transferidas)", "disciplinas": [{"code": "MAC118", "nota": 7, "aprovadaEm": "2020/1"}]}],
                  "equivalencias": [{"cursadas": ["MAC118"], "pedida": "COC602", "status": "a pedir"}], "fonte": fonte}
        ctx, pg = abre(b, perfil=perfil, nome=f"pc05-antigo-{fonte.get('historicoAtual', 'sem')}", relogio=RELOGIO)
        completo(pg, "pedidos")
        linha = pg.locator('.pedidos tr[class^="eq-"]').first.inner_text()
        assert "2025" in linha and "2020/1" in linha, linha                         # o prazo aparece
        assert (AVISO in linha) == com_aviso, (fonte, linha)
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

    # Em dúvida a pessoa decide (PC-05): sem escolha, aplicar e baixar ficam desativados e o texto diz por quê.
    ctx, pg = importa_cenario(b, "papel-duvida", "cr04-papel-duvida")
    assert pg.locator('input[name="siga-papel"]:checked').count() == 0
    expect(pg.locator(".papel-historico .alerta")).to_contain_text("ficam desativados até lá")
    expect(pg.locator("#siga-usar")).to_be_disabled(); expect(pg.locator("#siga-baixar")).to_be_disabled()
    pg.locator('input[name="siga-papel"][value="0"]').check()
    expect(pg.locator("#siga-usar")).to_be_enabled(); expect(pg.locator("#siga-baixar")).to_be_enabled()
    assert pg.locator(".papel-historico .alerta").count() == 0
    perfil, _ = aplica_e_le_pedido(pg)
    assert perfil["fonte"]["historicoAtual"] == "escolhido", perfil["fonte"]      # "duvida" nunca é gravada
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

@caso("CR-04/PC-05: escolha explícita vale para histórico reconhecido sem datas")
def t_cr04_escolha_sem_datas(b):
    ctx, pg = importa_cenario(b, "escolha-sem-datas", "cr04-escolha-sem-datas", escolha=0)
    assert pg.locator('input[name="siga-papel"][value="0"]').is_checked()
    perfil, _ = aplica_e_le_pedido(pg)
    confere_oraculo(perfil, "escolha-sem-datas")
    ctx.close()

@caso("PC-05: datas ausentes contam como dúvida (dois sem datas; só um datado, nas duas ordens)")
def t_pc05_datas_ausentes(b):
    for cenario in ("duvida-sem-datas", "duvida-misto-ab", "duvida-misto-ba"):
        ctx, pg = importa_cenario(b, cenario, f"pc05-{cenario}")
        assert pg.locator('input[name="siga-papel"]').count() == 2, cenario
        assert pg.locator('input[name="siga-papel"]:checked').count() == 0, cenario
        assert "Reconhecido pela data mais recente" not in pg.locator(".papel-historico").inner_text(), cenario
        expect(pg.locator(".papel-historico .alerta")).to_contain_text("ficam desativados até lá")
        expect(pg.locator("#siga-usar")).to_be_disabled(); expect(pg.locator("#siga-baixar")).to_be_disabled()
        pg.locator('input[name="siga-papel"][value="0"]').check()
        expect(pg.locator("#siga-usar")).to_be_enabled(); expect(pg.locator("#siga-baixar")).to_be_enabled()
        perfil, _ = aplica_e_le_pedido(pg)
        assert perfil["fonte"]["historicoAtual"] == "escolhido", (cenario, perfil["fonte"])
        ctx.close()

@caso("CR-04/PC-05: trocar o histórico atual na prévia recalcula os planos que ficam de fora")
def t_cr04_troca_recalcula_planos(b):
    perfil = {"periodos": [{"nome": "2025/1", "planejado": True, "disciplinas": ["MAC128"]}]}
    ctx, pg = abre(b, perfil=perfil, nome="cr04-troca-planos", relogio=RELOGIO)
    gera(pg, ["papel-bloco-2025.pdf", "plano-anterior.pdf", "boa-cursando.pdf"])
    assert pg.locator('input[name="siga-papel"][value="0"]').is_checked()              # automático: o do bloco de 2025
    assert pg.locator(".colisao-planos").count() == 0
    expect(pg.locator("#siga-usar")).to_be_enabled()
    pg.locator('input[name="siga-papel"][value="1"]').check()                         # escolha: o de 2024/2 vira o atual
    expect(pg.locator(".colisao-planos")).to_contain_text("2025/1")
    expect(pg.locator("#siga-usar")).to_be_disabled(); expect(pg.locator("#siga-baixar")).to_be_disabled()
    pg.locator("#siga-descartar-planos").check()
    expect(pg.locator("#siga-usar")).to_be_enabled()
    pg.locator('input[name="siga-papel"][value="0"]').check()                         # volta: o plano não colide mais
    assert pg.locator(".colisao-planos").count() == 0
    pg.locator('input[name="siga-papel"][value="1"]').check()
    expect(pg.locator(".colisao-planos")).to_contain_text("2025/1")                   # nova colisão exige nova confirmação
    expect(pg.locator("#siga-usar")).to_be_disabled()
    pg.locator("#siga-descartar-planos").check(); pg.click("#siga-usar")
    periodos = ls(pg, "perfilImportado")["periodos"]
    assert [p["nome"] for p in periodos if p.get("atual")] == ["2025/1"], periodos
    assert not any(p.get("planejado") and p["nome"] == "2025/1" for p in periodos), periodos
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

@caso("CR-02: dispensa importada com alvo fora do catálogo conta o alvo (4 cr) e não a origem (04e)")
def t_cr02_alvo_fora_do_catalogo(b):
    # o perfil sai do importador (PDF fictício), não é injetado: XYZ101 aprovada e ABC123 dispensada, ambas fora do catálogo
    ctx, pg = importa_cenario(b, "dispensa-fora-catalogo", "cr02-04e")
    pg.click("#siga-usar")
    perfil = ls(pg, "perfilImportado")
    confere_oraculo(perfil, "dispensa-fora-catalogo")
    completo(pg, "pedidos")
    assert creditos_por_grupo(pg) == {"1": 0, "2": 0, "3": 4, "4": 0}, creditos_por_grupo(pg)    # ABC123 4 cr; XYZ101 0 cr
    assert pg.locator(".aviso-dispensa").count() == 0                                           # dispensa única: sem aviso
    exporta_e_reimporta(b, pg, perfil, "cr02-04e-reimporta")
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

def abre_info_livre(pg):
    """No detalhamento, a explicação dos números da livre escolha fica atrás do botão ⓘ."""
    btn = pg.locator("#progresso .cat-3 .info-btn")
    if btn.get_attribute("aria-expanded") != "true": btn.click()
    expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_visible()

def numeros_livre(pg):
    """Textos dos dois números, nos Pedidos e no progresso detalhado da Grade."""
    completo(pg, "pedidos")
    pedidos = pg.locator(".pedidos .livre-numeros li").all_inner_texts()
    completo(pg, "grade")
    if pg.locator("#progresso").is_hidden(): pg.click("#bg-detalhes")
    abre_info_livre(pg)
    progresso = pg.locator("#progresso .cat-3 .livre-numeros li").all_inner_texts()
    # O ⓘ mostra os mesmos números de Pedidos, com rótulos curtos; sem BOA importado, só a estimativa da Grade.
    assert len(pedidos) == 2, pedidos
    numero = lambda t: (re.search(r"(Grade|BOA, soma das não explicitadas|BOA): ([\d.]+ cr|indisponível)", t) or [None])[0]
    esperado = [numero(pedidos[0])] + ([] if "nenhum BOA importado" in pedidos[1] else [numero(pedidos[1])])
    assert [numero(t) for t in progresso] == esperado and None not in esperado, (pedidos, progresso)
    assert not re.search(r"total do boa", " ".join(pedidos), re.I), pedidos
    return pedidos

@caso("D-02/PC-06: Pedidos mostra só os dois números (sem total sem origem) e não mostra a linha positiva de 5 anos")
def t_pedidos_sem_total_e_sem_check(b):
    ctx, pg = abre(b, perfil=p5(), nome="d02-sem-total")
    completo(pg, "pedidos")
    secao = pg.locator(".pedidos .sec:has(.livre-numeros)").inner_text()
    assert "no total" not in secao and re.search(r"Exigido \d+ cr", secao), secao
    assert pg.locator(".pedidos .livre-numeros li").count() == 2
    texto = pg.locator(".pedidos").inner_text()
    assert "dentro de 5 anos" not in texto and "✓ dentro" not in texto, texto
    ctx.close()
    for cenario in ("so-atual", "reingresso-antigo-atual"):                       # prazo bom: nenhuma linha positiva
        ctx, pg = importa_cenario(b, cenario, f"d02-sem-check-{cenario}")
        _, linha = aplica_e_le_pedido(pg)
        assert "dentro de 5 anos" not in linha and "mais de 5 anos" not in linha, linha
        ctx.close()

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
    """D-09: o aviso de que a Grade não é oficial é uma linha mínima no rodapé; o topo não tem mais a faixa."""
    assert pg.locator("#faixa-aviso").count() == 0, onde
    aviso = pg.locator("footer.rodape #aviso-rodape")
    assert aviso.inner_text().strip() == FAIXA, (onde, aviso.inner_text())
    assert aviso.get_attribute("role") == "note", onde
    aviso.scroll_into_view_if_needed(); expect(aviso).to_be_visible()
    assert pg.evaluate("() => { const a = document.getElementById('aviso-rodape'), t = document.querySelector('.topo');"
                       " return a.getBoundingClientRect().top >= t.getBoundingClientRect().bottom; }"), onde        # fora do topo
    assert pg.evaluate("() => parseFloat(getComputedStyle(document.getElementById('aviso-rodape')).fontSize)") <= 13, onde   # linha mínima
    pg.evaluate("window.scrollTo(0, 0)")

@caso("RF-08 (08a, 08b) · D-09: aviso no rodapé, no clássico, após recarregar, após trocar de modo e nas seis abas; sem e com perfil; desktop e celular")
def t_rf08_faixa(b):
    for rotulo, vp, toque in (("desktop", D, False), ("celular", C, True)):
        for com_perfil in (False, True):
            ctx, pg = abre(b, vp=vp, perfil=PERFIL if com_perfil else None, nome=f"rf08-faixa-{rotulo}-{com_perfil}", toque=toque, modo="classico")
            nome = f"{rotulo}/{'perfil' if com_perfil else 'sem perfil'}"
            confere_faixa(pg, nome + "/classico")
            pg.reload(); pg.wait_for_load_state("load"); confere_faixa(pg, nome + "/recarga")
            alterna_modo(pg); confere_faixa(pg, nome + "/planejador")
            for vista in ("grade", "timeline", "optativas", "cronograma", "pedidos", "eci"):
                pg.click(f'[data-vista="{vista}"]'); confere_faixa(pg, f"{nome}/{vista}")
                if vista == "eci" and pg.locator("#dlg-eci[open]").count(): pg.keyboard.press("Escape")
            alterna_modo(pg); confere_faixa(pg, nome + "/de volta ao classico")
            if com_perfil:
                pg.locator("#aviso-rodape").scroll_into_view_if_needed()
                foto(pg, f"rf08-aviso-rodape-{rotulo}")
            ctx.close()

SOBRE = [
    "A Grade ECI é feita por alunos de Engenharia de Computação e Informação da UFRJ, para alunos do curso. Sugestões e correções são bem-vindas pelas issues.",
    "Seus dados ficam neste navegador. Os PDFs do SIGA e o perfil são lidos no seu dispositivo. Nada é enviado a um servidor. O arquivo que você exporta é uma cópia sua; guarde-o em local privado.",
    "Clássico: a grade do curso numa tela, para pintar o que você já fez.",
    "Planejador: linha do tempo, optativas, cronograma, pedidos de equivalência e extensão.",
    "A Grade orienta, não confirma. Ela não é um serviço da UFRJ nem da coordenação. Créditos, requisitos e prazos são estimativas. A confirmação fica com o SIGA, o BOA e a coordenação do curso.",
    "Os horários de referência são mantidos por alunos e mudam a cada semestre. Confira no SIGA.",
    "Para quem reingressou, a data que vale para o prazo de 5 anos ainda está em consulta.",
    "O limite de 25% de créditos por equivalência e os prazos de pedido não são avisados.",
    "Marcações feitas com o pincel são simulações suas, não registros.",
    "Use só dados fictícios: a issue é pública.",
]
@caso("D-09: seção Sobre em Configurações com o texto aprovado e os links do repositório e de relato; teclado")
def t_sobre(b):
    for vp, toque in ((D, False), (C, True)):
        ctx, pg = abre(b, vp=vp, toque=toque, nome=f"sobre-{vp['width']}")
        pg.click("#btn-config")
        sec = pg.locator("#dlg-config #cfg-sobre")
        expect(sec.locator("h2")).to_have_text("Sobre")
        texto = " ".join(sec.inner_text().split())
        faltam = [t for t in SOBRE if t not in texto]
        assert not faltam, (faltam, texto)
        assert "Grêmio" not in texto
        hrefs = sec.locator("a").evaluate_all("(as) => as.map((a) => [a.getAttribute('href'), a.target, a.rel])")
        assert hrefs == [["https://github.com/JoaoAndrade01/grade", "_blank", "noopener noreferrer"],
                         ["https://github.com/JoaoAndrade01/grade/issues/new/choose", "_blank", "noopener noreferrer"]], hrefs
        link = sec.locator("a").last
        for _ in range(80):                                     # alcançável por Tab dentro da janela
            if pg.evaluate("document.activeElement.closest('#cfg-sobre a') !== null && document.activeElement.href.endsWith('/choose')"): break
            pg.keyboard.press("Tab")
        if b.browser_type.name != "webkit":                    # PUB-09: no WebKit do ambiente de teste o Tab não alcança links
            assert pg.evaluate("document.activeElement.href || ''").endswith("/issues/new/choose")
        link.scroll_into_view_if_needed(); foto(pg, f"sobre-configuracoes-{vp['width']}")
        pg.keyboard.press("Escape")
        ctx.close()

def folga_do_info(pg):
    """Distância entre o fim do texto "Livre escolha" e a borda externa do contorno de foco do ⓘ (negativa = cobre o título)."""
    return pg.evaluate("""() => { const b = document.querySelector('#progresso .cat-3 .info-btn'), s = b.closest('span');
        const r = document.createRange(); r.selectNodeContents(s.firstChild); const fim = r.getBoundingClientRect().right;
        const cs = getComputedStyle(b); return b.getBoundingClientRect().left - (parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth || 2)) - fim; }""")

ESTADOS = ["Aprovada", "Aprovação prevista", "Cursando", "Planejada", "Equivalência pedida", "Reprovada", "Pendente"]
@caso("Detalhamento: ⓘ pequeno no título da livre escolha (mouse, teclado e toque); cartão no formato dos outros; sem a legenda de estados")
def t_detalhamento_info(b):
    ctx, pg = abre(b, perfil=p5(), nome="detalhamento-info")
    completo(pg, "grade"); pg.click("#bg-detalhes")
    assert pg.locator("#progresso .livre-curta").count() == 0                         # sem a linha extra
    fechado = pg.locator("#progresso .cat-3").inner_text()
    assert "BOA" not in fechado and "Grade" not in fechado, fechado                    # B1: nenhum número sem rótulo
    formato = lambda k: pg.evaluate("(k) => [...document.querySelector(`#progresso .cat-${k}`).children].filter((e) => !e.hidden).map((e) => e.className || e.tagName)", k)
    assert formato(3) == formato(2), (formato(3), formato(2))                        # título + número, barra, "faltam"
    btn, info = pg.locator("#progresso .cat-3 .prog-topo .info-btn"), pg.locator("#progresso .cat-3 .livre-info")
    expect(btn.locator("svg.ico")).to_have_count(1); expect(btn).to_have_text(""); expect(btn).to_have_attribute("aria-expanded", "false"); expect(info).to_be_hidden()
    assert btn.get_attribute("aria-label") and btn.get_attribute("aria-controls") == info.get_attribute("id")
    estilo = btn.evaluate("""(e) => { const s = getComputedStyle(e), t = getComputedStyle(e.closest('.prog-topo'));
        return [s.borderTopStyle, s.borderTopWidth, s.backgroundColor, s.fontSize === t.fontSize]; }""")
    assert estilo[0] == "none" or estilo[1] == "0px", estilo                         # sem círculo nem borda
    assert estilo[2] in ("rgba(0, 0, 0, 0)", "transparent") and estilo[3], estilo     # sem fundo; ícone do tamanho do texto
    r = btn.bounding_box(); assert r["width"] >= 23.99 and r["height"] >= 23.99, r     # alvo mínimo pela caixa, não pelo ícone
    titulo = pg.locator("#progresso .cat-3 .prog-topo").bounding_box()["height"]
    assert abs(titulo - pg.locator("#progresso .cat-2 .prog-topo").bounding_box()["height"]) < 1, titulo   # a linha do título não cresce
    btn.click(); expect(info).to_be_visible(); expect(btn).to_have_attribute("aria-expanded", "true")
    textos = info.locator("li").all_inner_texts()
    assert textos == ["Grade: 2 cr (estimativa)", "BOA, soma das não explicitadas: 6 cr (BOA de 2026-11-20)"], textos
    assert info.locator(".nota-estimativa").inner_text() == NOTA_RA13
    pg.click("#bg-detalhes"); pg.click("#bg-detalhes")                                  # redesenho mantém a escolha
    expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_visible()
    pg.locator("#progresso .cat-3 .info-btn").click(); expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_hidden()
    pg.locator("#bg-detalhes").focus(); pg.keyboard.press("Tab")                      # teclado: Tab chega ao ⓘ
    assert pg.evaluate("document.activeElement.id") == "livre-info-btn"
    pg.keyboard.press("Enter")
    assert pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") != "none"
    assert pg.evaluate("parseFloat(getComputedStyle(document.activeElement).outlineOffset)") >= 2
    assert folga_do_info(pg) >= 1, folga_do_info(pg)                                  # o contorno não encosta no título
    expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_visible()
    pg.keyboard.press("Space"); expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_hidden()
    legenda = pg.locator("#legenda").inner_text() if pg.locator("#legenda").is_visible() else ""
    assert pg.locator("#legenda .leg").count() == 0 and not any(e in legenda for e in ESTADOS), legenda
    pg.locator("#progresso .cat-3 .info-btn").click(); foto(pg, "detalhamento-info")
    ctx.close()
    # sem BOA importado: o ⓘ só explica a estimativa da Grade
    ctx, pg = abre(b, perfil=p5(boa=None), nome="detalhamento-info-sem-boa")
    completo(pg, "grade"); pg.click("#bg-detalhes"); pg.locator("#progresso .cat-3 .info-btn").click()
    info = pg.locator("#progresso .cat-3 .livre-info")
    assert info.locator("li").all_inner_texts() == ["Grade: 2 cr (estimativa)"] and "BOA" not in info.inner_text(), info.inner_text()
    ctx.close()
    ctx, pg = abre(b, vp=C, perfil=p5(), toque=True, nome="detalhamento-info-toque")
    completo(pg, "grade"); pg.locator("#bg-detalhes").tap()
    pg.locator("#progresso .cat-3 .info-btn").tap(); expect(pg.locator("#progresso .cat-3 .livre-info")).to_be_visible()
    r = pg.locator("#progresso .cat-3 .info-btn").bounding_box(); assert r["width"] >= 43.99 and r["height"] >= 43.99, r
    assert folga_do_info(pg) >= 1, folga_do_info(pg)                                  # a área de toque não cobre o título
    # O fim de "escolha" não pertence ao botão (a conferência é geométrica: o toque emulado do Chromium e do WebKit
    # ajusta o alvo para o controle vizinho, como no aparelho, e não mede a área do botão).
    assert pg.evaluate("""() => { const s = document.querySelector('#progresso .cat-3 .prog-topo span'), r = document.createRange();
        r.selectNodeContents(s.firstChild); const q = r.getBoundingClientRect();
        return !document.elementFromPoint(q.right - 1, q.top + q.height / 2).closest('.info-btn'); }""")
    foto(pg, "detalhamento-info-celular")
    ctx.close()

@caso("RF-08 (08c, 08d): nota de RA-13 junto dos dois números e nota de RA-09 junto da idade")
def t_rf08_notas_credito(b):
    ctx, pg = abre(b, perfil=p5(), nome="rf08-ra13")
    completo(pg, "pedidos")
    assert pg.locator(".pedidos .livre-numeros + .nota-estimativa").inner_text() == NOTA_RA13
    completo(pg, "grade")
    if pg.locator("#progresso").is_hidden(): pg.click("#bg-detalhes")
    abre_info_livre(pg)
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

@caso("RF-08 (RA-19): deduzido só com semestre sugerido e mantido ao reimportar os mesmos PDFs")
def t_rf08_deduzido_regras(b):
    ctx, pg = abre(b, nome="rf08-ra19-so-boa", relogio=RELOGIO)
    gera(pg, ["boa-cursando.pdf"])                                   # só BOA: não há semestre para deduzir
    assert pg.input_value("#siga-atual") == ""
    expect(pg.locator("#siga-nota-ra19")).to_be_hidden()
    pg.click("#siga-usar")
    assert "deduzido" not in [p for p in ls(pg, "perfilImportado")["periodos"] if p.get("atual")][0]
    ctx.close()
    ctx, pg = abre(b, nome="rf08-ra19-reimporta", relogio=RELOGIO)
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); pg.click("#siga-usar")
    assert [p for p in ls(pg, "perfilImportado")["periodos"] if p.get("atual")][0].get("deduzido") is True
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"])           # mesmos PDFs de novo
    assert pg.input_value("#siga-atual") == "2026/2"
    expect(pg.locator("#siga-nota-ra19")).to_be_visible()
    pg.click("#siga-usar")
    assert [p for p in ls(pg, "perfilImportado")["periodos"] if p.get("atual")][0].get("deduzido") is True
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
    # 08h: o perfil NÃO traz horários; eles têm de vir da referência (js/horarios.js, Notion), com a nota de RA-20
    perfil = {"periodos": [{"nome": "2027/1", "planejado": True, "disciplinas": [{"code": "MAC238"}]}]}
    ctx, pg = abre(b, perfil=perfil, nome="rf08-ra20-horarios")
    referencia = pg.evaluate("() => window.horarios[1].impar.MAC238")            # /1 usa a tabela ímpar
    assert referencia == ["ter 10-12", "qui 10-12"], referencia
    completo(pg, "cronograma"); pg.click('[data-cperiodo="2027/1"]')
    item = pg.locator('.crono-item:has([data-csel="MAC238"])')
    assert "sem horário" in item.inner_text()                                       # nada vem do perfil
    ref = item.locator(".ref-linha")
    assert ref.inner_text().startswith("Referência: " + ", ".join(referencia)), ref.inner_text()
    ref.locator("[data-usaref]").click()                                            # adotar a referência grava os horários
    item = pg.locator('.crono-item:has([data-csel="MAC238"])')
    assert "ter 10-12" in item.inner_text() and "qui 10-12" in item.inner_text() and "igual ao horário de referência" in item.inner_text()
    assert nota_ra20(pg) in pg.locator("#painel .nota-estimativa").all_inner_texts()
    foto(pg, "rf08-cronograma-nota-horarios")
    ctx.close()

@caso("RF-08: versão, data de conferência do currículo e link de relato no rodapé e na falha de importação")
def t_rf08_rodape(b):
    for rotulo, vp, toque in (("desktop", D, False), ("celular", C, True)):
        ctx, pg = abre(b, vp=vp, nome=f"rf08-rodape-{rotulo}", toque=toque, modo="classico")
        for modo in ("classico", "completo"):
            if modo == "completo": alterna_modo(pg)
            rodape = pg.locator(".rodape")
            rodape.scroll_into_view_if_needed()
            expect(pg.locator("#versao")).to_be_visible(); assert pg.locator("#versao").inner_text() == "v2.1.0"
            consultado = pg.evaluate("() => window.curriculoSIGA[1].consultado")
            assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", consultado), consultado
            assert pg.locator("#curriculo-conferido").inner_text() == f"Currículo conferido no SIGA em {consultado}", (rotulo, modo)
            link = pg.locator("#link-relato"); expect(link).to_be_visible()
            assert link.inner_text() == "Achou um erro? Crie uma nova issue"
            href = link.get_attribute("href")
            assert href == "https://github.com/JoaoAndrade01/grade/issues/new/choose", href      # escolha de modelo; sem dados da pessoa
            credito = pg.locator("#link-credito"); expect(credito).to_be_visible()          # crédito ao Grêmio, nos dois modos
            assert credito.inner_text() == "Baseado na Grade do Grêmio ECI" and credito.get_attribute("href") == "https://github.com/gremio-eci/grade"
            if modo == "completo":
                expect(pg.locator("#link-github")).to_be_visible()
                assert pg.locator("#link-github").get_attribute("href") == "https://github.com/JoaoAndrade01/grade"
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
    return pg.locator("#progresso").inner_text()

ESCALA = ["Trivial", "Só o básico", "Matéria de verdade", "Difícil", "Morte instantânea"]
def estado_das_legendas(pg):
    return pg.evaluate(r"""() => { const v = (s) => { const e = document.querySelector(s); return !!e && !e.hidden && !!e.offsetParent || (!!e && !e.hidden && getComputedStyle(e).position === 'fixed'); };
        const leg = document.querySelector('#legenda'), prog = document.querySelector('#progresso');
        return { barra: v('#barra-geral'), detalhes: v('#bg-detalhes'), progresso: v('#progresso'),
                 categorias: v('#legenda') && leg.querySelectorAll('.leg-cat').length > 0,
                 escala: [...document.querySelectorAll('.leg-niv')].filter((e) => !!e.offsetParent).map((e) => e.textContent.replace(/^\S+\s/, '')),
                 manual: !!prog && !prog.hidden && /Aprovação por marcação manual \(pincel\)/.test(prog.textContent),
                 manualFora: !!leg && !leg.hidden && /marcação manual/.test(leg.textContent) }; }""")

@caso("Abas: barra e Detalhes só na Grade e na Linha do tempo; categorias só na Linha do tempo; escala junto a Exibir → Dificuldade; marcação manual no detalhamento")
def t_abas_legendas(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"marcacoes": {"MAC238": "aprovada"}, "progressoAberto": True}, nome="abas-legendas")
    completo(pg)
    observado = {}
    for vista in ("grade", "timeline", "optativas", "cronograma", "pedidos", "eci"):
        pg.click(f'[data-vista="{vista}"]'); observado[vista] = estado_das_legendas(pg)
    com = {"barra": True, "detalhes": True, "progresso": True, "escala": [], "manual": True, "manualFora": False}
    sem = {"barra": False, "detalhes": False, "progresso": False, "categorias": False, "escala": [], "manual": False, "manualFora": False}
    assert observado == {"grade": {**com, "categorias": False}, "timeline": {**com, "categorias": True},
                         **{v: sem for v in ("optativas", "cronograma", "pedidos", "eci")}}, observado
    # Dificuldade: o filtro por nível é a legenda (bolinha e nome), numa fileira só; não há legenda separada
    pg.click('[data-vista="grade"]'); pg.click('#ferramentas [data-exibir="dificuldade"]'); assert aceso(pg.locator('#ferramentas [data-exibir="dificuldade"]'))
    assert pg.locator("#ferramentas .filtro-nivel .rot").all_inner_texts() == ESCALA and estado_das_legendas(pg)["escala"] == []
    foto(pg, "abas-dificuldade-filtro-legenda")
    ctx.close()
    # Clássico (só pintar): sem barra, detalhamento nem legenda, mesmo com Dificuldade ligada (a preferência fica salva).
    ctx, pg = abre(b, perfil=PERFIL, extra={"marcacoes": {"MAC238": "aprovada"}, "progressoAberto": True, "modoClassico": True,
                                           "exibir": {"codigo": True, "dificuldade": True}}, nome="abas-legendas-classico")
    assert estado_das_legendas(pg) == sem, estado_das_legendas(pg)
    assert ls(pg, "exibir")["dificuldade"] is True and ls(pg, "progressoAberto") is True
    ctx.close()
    # Sem perfil: sem barra nem detalhamento, em qualquer aba.
    ctx, pg = abre(b, nome="abas-legendas-sem-perfil", extra={"modoClassico": False})
    for vista in ("grade", "timeline", "optativas"):
        pg.click(f'[data-vista="{vista}"]'); e = estado_das_legendas(pg)
        assert not e["barra"] and not e["progresso"] and not e["manual"], (vista, e)
    ctx.close()

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
        for sel in ["#btn-importar", "#btn-perfil", "#btn-privacidade", "#btn-tema", "#seletor-modo label >> nth=0", "#seletor-modo label >> nth=1"]:
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

# ================================================================== cenários do segundo kit de revisão
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

def destaque(pg):
    return pg.evaluate("""() => { const q = (c) => [...document.querySelectorAll(`#painel .card.${c}[data-code]`)].map((e) => e.dataset.code).sort();
        return { self: q('hl-self'), pre: q('hl-req'), co: q('hl-coreq'), libera: q('hl-dep'), ativo: document.querySelector('#painel').classList.contains('destacando') }; }""")
def libera_sobrepoe(pg):
    """Cartões com a etiqueta "libera" cujo retângulo cruza o do nome (ou o do código): deve ser vazio."""
    return pg.evaluate("""() => { const cruza = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        const ruins = [], n = document.querySelectorAll('#painel .card.hl-dep').length;
        document.querySelectorAll('#painel .card.hl-dep').forEach((c) => { const e = c.querySelector('.etq-libera');
          if (!e) { ruins.push(c.dataset.code + ': sem etiqueta'); return; }
          const r = e.getBoundingClientRect(), k = c.getBoundingClientRect();
          if (r.left < k.left - 0.5 || r.right > k.right + 0.5 || r.bottom > k.bottom + 0.5) ruins.push(c.dataset.code + ': fora do cartão');
          c.querySelectorAll('.nome, .meta').forEach((t) => { if (cruza(r, t.getBoundingClientRect())) ruins.push(c.dataset.code + ': cobre ' + t.className); }); });
        return { n, ruins }; }""")
def esmaecido(pg, code):
    """Esmaecido: fundo neutro e texto atenuado (o contraste do texto continua acima de 4,5:1; o axe confere)."""
    pg.evaluate("Promise.all(document.getAnimations().map((a) => a.finished.catch(() => 0)))")     # transição terminada
    return pg.locator(f'#painel .card[data-code="{code}"]').evaluate("""e => { const m = getComputedStyle(document.body).getPropertyValue('--muted');
        const t = document.createElement('i'); t.style.color = m; document.body.append(t); const cor = getComputedStyle(t).color; t.remove();
        return getComputedStyle(e.querySelector('.nome')).color === cor; }""")
def contorno(pg, code): return pg.locator(f'#painel .card[data-code="{code}"]').evaluate("e => getComputedStyle(e).outlineStyle")

@caso("Trilha Ao passar o mouse (o antigo Em foco): pré-requisito contínuo, co-requisito tracejado, 'libera' no dependente; o resto esmaece; mouse, teclado e detalhes; Desligado")
def t_destaque(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": {"destaque": "foco"}}, nome="destaque")
    expect(pg.get_by_role("radiogroup", name="Trilha dos requisitos")).to_be_visible()
    expect(pg.get_by_role("radio", name="Ao passar o mouse", exact=True)).to_be_checked()
    assert pg.locator("#painel svg.setas").count() == 0                       # a Grade não desenha mais setas
    pg.locator('.card[data-code="MAC128"]').hover()
    d = destaque(pg)
    assert d == {"self": ["MAC128"], "pre": ["MAC118"], "co": [], "libera": ["FIM230", "MAC238", "MAC248"], "ativo": True}, d
    assert contorno(pg, "MAC118") == "solid"
    assert pg.locator('.card[data-code="MAC238"] .etq-libera').inner_text() == "libera" and not libera_sobrepoe(pg)["ruins"]
    assert esmaecido(pg, "COS110") and not esmaecido(pg, "MAC118")                 # o resto esmaece
    assert "libera" in pg.locator(".leg-destaque").inner_text()                   # legenda explica sem depender da cor
    foto(pg, "destaque-em-foco")
    pg.mouse.move(5, 5)                                                            # o mouse limpa ao sair
    assert destaque(pg)["self"] == [] and not destaque(pg)["ativo"] and not esmaecido(pg, "COS110")
    pg.locator('.card[data-code="COS110"]').focus(); pg.keyboard.press("Tab")    # teclado: o destaque acompanha o foco
    foco = pg.evaluate("document.activeElement.dataset.code")
    assert destaque(pg)["self"] == [foco], (foco, destaque(pg))
    pg.locator('.card[data-code="COS231"]').focus()
    d = destaque(pg); assert d["self"] == ["COS231"] and len(d["co"]) == 1 and d["pre"], d
    assert contorno(pg, d["co"][0]) == "dashed" and contorno(pg, d["pre"][0]) == "solid"
    s = libera_sobrepoe(pg); assert s["n"] >= 2 and not s["ruins"], s                  # EEL418 e COS242: a etiqueta não cobre o nome
    foto(pg, "destaque-libera-cos231")
    pg.locator("#btn-config").focus()                                             # o foco sai da Grade: o destaque some
    assert destaque(pg)["self"] == []
    pg.locator('.card[data-code="COS231"]').click(); expect(pg.locator("#detalhes")).to_be_visible()
    pg.mouse.move(5, 5)
    assert destaque(pg)["self"] == ["COS231"]                                     # com os detalhes abertos, fica na consultada
    pg.keyboard.press("Escape")
    escolhe_trilha(pg, "desligado"); assert ls(pg, "exibir")["destaque"] == "desligado"
    expect(pg.get_by_role("radio", name="Desligado", exact=True)).to_be_checked()
    pg.locator('.card[data-code="MAC128"]').hover()
    assert destaque(pg) == {"self": [], "pre": [], "co": [], "libera": [], "ativo": False} and not esmaecido(pg, "COS110")
    abre_config(pg); assert pg.locator('#dlg-config input[name="destaque"][value="desligado"]').is_checked()
    pg.check('#dlg-config input[name="destaque"][value="foco"]'); pg.keyboard.press("Escape")
    expect(pg.get_by_role("radio", name="Ao passar o mouse", exact=True)).to_be_checked()
    ctx.close()
    # toque: o primeiro toque consulta (e destaca), o segundo pinta; Clássico, 320 px e tema escuro
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"exibir": {"destaque": "foco"}}, nome="destaque-toque", toque=True, esquema="dark", modo="classico")
    assert pg.locator("#modo-classico").is_checked()
    pg.locator('.card[data-code="MAC248"]').tap()
    expect(pg.locator("#consulta")).to_be_visible(); assert "MAC248" not in (ls(pg, "marcacoes") or {})
    assert pg.locator("#consulta-detalhes").count() == 0                     # Clássico: consulta só com o texto
    d = destaque(pg); assert d["self"] == ["MAC248"] and d["pre"] == ["MAC128"] and d["ativo"], d
    foto(pg, "destaque-toque-320-escuro")
    pg.locator('.card[data-code="MAC248"]').tap(); assert "MAC248" in ls(pg, "marcacoes")
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    ctx.close()
    # Planejador com pincel escolhido: o primeiro toque só consulta e acende o destaque; a etiqueta não cobre o nome
    for esquema in ("dark", "light"):
        ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": {"destaque": "foco"}}, nome=f"destaque-pincel-{esquema}", toque=True, esquema=esquema)
        pg.locator('#paleta [data-pincel="cursando"]').tap()
        expect(pg.locator('#paleta [data-pincel="cursando"]')).to_have_attribute("aria-pressed", "true")
        pg.locator('.card[data-code="COS231"]').tap()
        expect(pg.locator("#consulta")).to_be_visible(); assert "COS231" not in (ls(pg, "marcacoes") or {})   # não marcou
        d = destaque(pg); assert d["self"] == ["COS231"] and d["ativo"] and "EEL418" in d["libera"], d
        s = libera_sobrepoe(pg); assert s["n"] >= 2 and not s["ruins"], (esquema, s)
        pg.locator('.card[data-code="EEL418"]').scroll_into_view_if_needed(); foto(pg, f"destaque-pincel-320-{esquema}")
        pg.locator('.card[data-code="COS231"]').tap(); assert ls(pg, "marcacoes").get("COS231") == "cursando"   # o segundo toque marca
        ctx.close()

@caso("Trilha: setas Ocultas migra para Desligado; Disciplina em foco e Todas para Ao passar o mouse; sem chave, Ao segurar; a chave antiga sai; outras preferências ficam")
def t_destaque_migracao(b):
    for antigo, novo in (("ocultas", "desligado"), ("foco", "foco"), ("todas", "foco"), (None, "segurar")):
        exibir = {"codigo": False, "notas": True} | ({"setas": antigo} if antigo else {})
        ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": exibir}, nome=f"destaque-migracao-{antigo}")
        salvo = ls(pg, "exibir")
        if antigo: assert "setas" not in salvo and salvo["destaque"] == novo and salvo["codigo"] is False and salvo["notas"] is True, salvo
        expect(trilha(pg, novo)).to_be_checked()
        assert pg.locator('#ferramentas .seletor-trilha input:checked').count() == 1
        assert not aceso(pg.locator('#ferramentas [data-exibir="codigo"]')) and aceso(pg.locator('#ferramentas [data-exibir="notas"]'))
        pg.locator('.card[data-code="MAC128"]').hover()
        assert destaque(pg)["ativo"] == (novo == "foco"), antigo
        ctx.close()
    # a escolha nova prevalece sobre a chave antiga que sobrou
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": {"setas": "todas", "destaque": "desligado"}}, nome="destaque-migracao-ambos")
    assert ls(pg, "exibir")["destaque"] == "desligado" and "setas" not in ls(pg, "exibir")
    ctx.close()

ANTIGAS_TAGS = [{"id": "aprovada", "nome": "Aprovada", "cor": "#16a34a", "status": "aprovado"},
                {"id": "aprov-esperada", "nome": "Aprovação esperada", "cor": "#84cc16", "status": "previsto"},
                {"id": "cursando", "nome": "Cursando", "cor": "#2563eb", "status": "cursando"},
                {"id": "reprov-esperada", "nome": "Reprovação esperada", "cor": "#dc2626", "status": "reprovado"},
                {"id": "planejada", "nome": "Planejada", "cor": "#7c3aed", "status": "planejado"}]
@caso("Tags: paleta Cursada/Cursando/Planejada; migração do padrão antigo sem mudar estados; tags personalizadas preservadas")
def t_tags(b):
    ctx, pg = abre(b, nome="tags-novas", modo="classico")
    nomes = pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()
    assert [n.split()[0] for n in nomes] == ["Cursada", "Cursando", "Planejada", "Limpar"], nomes            # Clássico: "Limpar"
    expect(pg.get_by_role("button", name="Limpar", exact=True)).to_have_attribute("title", re.compile("Limpar"))
    assert "conta como concluída" in pg.locator('[data-pincel="aprovada"]').get_attribute("title").lower() or "Concluída" in pg.locator('[data-pincel="aprovada"]').get_attribute("title")
    ctx.close()
    # navegador com o padrão antigo salvo e marcação "Aprovação esperada"
    ctx, pg = abre(b, extra={"tags": ANTIGAS_TAGS, "marcacoes": {"COS110": "aprov-esperada", "COS111": "aprovada"}}, nome="tags-migra", modo="classico")
    nomes = [n.split("\n")[0].strip() for n in pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()]
    nomes = [n.rsplit(" ", 1)[0] if n[-1:].isdigit() else n for n in nomes]
    assert nomes[:3] == ["Cursada", "Cursando", "Planejada"] and any(n.startswith("Aprovação esperada") for n in nomes) and not any(n.startswith("Reprovação") for n in nomes), nomes
    tot = pg.evaluate("GradeInterativa.totais()")
    assert tot["1"]["prev"] == 5 and tot["1"]["ok"] == 2, tot["1"]                         # COS110 continua prevista, COS111 concluída
    ctx.close()
    # perfil antigo com estado "previsto" sem tag na paleta: cartão continua pintado
    ctx, pg = abre(b, perfil=PERFIL, nome="tags-perfil", modo="classico")
    assert "com-tag" in pg.locator('.card[data-code="MAC118"]').get_attribute("class")
    ctx.close()
    custom = [{"id": "minha", "nome": "Quero fazer", "cor": "#0891b2", "status": "planejado"}]
    ctx, pg = abre(b, extra={"tags": custom}, nome="tags-custom", modo="classico")
    assert [n.split()[0] for n in pg.locator("#paleta .pal-btn[data-pincel]").all_inner_texts()][:2] == ["Quero", "Limpar"]
    ctx.close()

TAG_REPROVACAO = {"id": "rep", "nome": "Reprovei", "cor": "#aa0000", "status": "reprovado"}
@caso("Tags: 'Reprovação (não conta)' vira 'Não conta' no navegador, no perfil importado e no exportado; reprovação do período atual segue vermelha")
def t_tags_nao_conta(b):
    # tags salvas no navegador
    ctx, pg = abre(b, perfil=PERFIL, extra={"tags": [*ANTIGAS_TAGS[:3], TAG_REPROVACAO], "marcacoes": {"MAC118": "rep"}}, nome="tags-nao-conta-local")
    assert [t["status"] for t in ls(pg, "tags")] == ["aprovado", "previsto", "cursando", "pendente"], ls(pg, "tags")
    assert ls(pg, "marcacoes") == {"MAC118": "rep"}
    pg.click("#btn-tags")
    opcoes = pg.locator('#detalhes [data-tagstatus="3"] option').all_inner_texts()
    assert "Não conta" in opcoes and not any("Reprova" in o for o in opcoes), opcoes
    assert pg.locator('#detalhes [data-tagstatus="3"]').input_value() == "pendente"
    exportado = pg.evaluate("() => GradeInterativa.perfilExportado()")
    assert [t["status"] for t in exportado["tags"]] == ["aprovado", "previsto", "cursando", "pendente"], exportado["tags"]
    ctx.close()
    # perfil antigo (importado) com a tag "reprovado": vale e é convertido; reimportar o exportado dá o mesmo
    antigo = {**PERFIL, "tags": [ANTIGAS_TAGS[0], TAG_REPROVACAO], "marcacoes": {"MAC118": "rep"}}
    ctx, pg = abre(b, perfil=antigo, nome="tags-nao-conta-perfil")
    assert not pg.locator("#aviso-perfil").is_visible()
    exportado = pg.evaluate("() => GradeInterativa.perfilExportado()")
    assert exportado["tags"][1]["status"] == "pendente" and exportado["marcacoes"] == {"MAC118": "rep"}, exportado
    tot = pg.evaluate("JSON.stringify(GradeInterativa.totais())")
    ctx2, pg2 = abre(b, perfil=exportado, nome="tags-nao-conta-reimporta")
    assert pg2.evaluate("JSON.stringify(GradeInterativa.totais())") == tot
    ctx2.close(); ctx.close()
    # reprovação importada no período atual: cor reserva vermelha, sem depender de tag
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118"]},
                           {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "FIT112", "status": "reprovado"}]}]}
    ctx, pg = abre(b, perfil=perfil, extra={"tags": [ANTIGAS_TAGS[0], TAG_REPROVACAO]}, nome="tags-reprovacao-atual", modo="classico")
    card = pg.locator('.card[data-code="FIT112"]')
    assert "com-tag" in card.get_attribute("class") and "#dc2626" in card.get_attribute("style"), card.get_attribute("style")
    # a tag "Não conta" convertida não pinta as pendentes que ninguém marcou
    assert "com-tag" not in pg.locator('.card[data-code="MAC128"]').get_attribute("class")
    ctx.close()

@caso("Barra: quatro trechos (concluídas, previstas, cursando, planejadas) com somas iguais; cor de uma tag por tipo; salva, exporta e reimporta")
def t_barra_quatro_trechos(b):
    perfil = {"periodos": [
        {"nome": "2025/1", "disciplinas": ["MAC118", "COS110"]},
        {"nome": "2026/2", "atual": True, "disciplinas": [{"code": "MAC128", "status": "previsto"}, {"code": "FIT112", "status": "cursando"}]},
        {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238", "EEL280"]}]}
    ctx, pg = abre(b, perfil=perfil, nome="barra-quatro")
    segs = pg.evaluate("""() => [...document.querySelectorAll('#barra-geral .bg-barra > span')].map((s) => [s.className, parseFloat(s.style.width)])""")
    assert [s[0] for s in segs] == ["seg-ok", "seg-prev", "seg-cur", "seg-plan", "seg-resto"], segs
    t = pg.evaluate("GradeInterativa.totais()")
    total = sum(t[k]["total"] for k in "1234")
    pc = lambda v: v / total * 100
    ok = sum(t[k]["ok"] for k in "1234"); prev = sum(t[k]["prev"] for k in "1234"); cur = sum(t[k]["cur"] for k in "1234")
    plan = sum(t[k]["plan"] - t[k]["cur"] for k in "1234")
    assert (ok, prev, cur, plan) == (11, 4, 4, 9), (ok, prev, cur, plan)    # MAC118 6 + COS110 5; MAC128 4; FIT112 4; MAC238 4 + EEL280 5
    for (cls, w), v in zip(segs, (ok, prev, cur, plan)):
        assert abs(w - pc(v)) < 0.01, (cls, w, pc(v))
    assert abs(sum(w for _, w in segs) - 100) < 0.01, segs
    padrao = pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-ok')).backgroundColor")
    # Opção B: "Usar a cor desta tag na barra"; no máximo uma por tipo; "Não conta" não oferece
    pg.click("#btn-tags")
    assert pg.locator('#detalhes [data-tagbarra]').count() == 3                            # Cursada, Cursando, Planejada
    pg.click("#tag-nova")                                                                    # nova tag começa "Não conta"
    assert pg.locator('#detalhes [data-tagbarra="3"]').count() == 0
    pg.locator('#detalhes [data-tagstatus="3"]').select_option("aprovado")
    pg.locator('#detalhes [data-tagcor="3"]').evaluate("(el) => { el.value = '#0891b2'; el.dispatchEvent(new Event('change', { bubbles: true })); }")
    pg.locator('#detalhes [data-tagbarra="0"]').check()
    assert pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-ok')).backgroundColor") == "rgb(22, 163, 74)"
    pg.locator('#detalhes [data-tagbarra="3"]').check()                                       # desmarca a outra do mesmo tipo
    expect(pg.locator('#detalhes [data-tagbarra="0"]')).not_to_be_checked()
    assert [bool(x.get("barra")) for x in ls(pg, "tags")] == [False, False, False, True], ls(pg, "tags")
    assert pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-ok')).backgroundColor") == "rgb(8, 145, 178)"
    assert pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-cur')).backgroundColor") != "rgb(8, 145, 178)"
    pg.locator('#detalhes [data-tagbarra="3"]').uncheck()
    assert pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-ok')).backgroundColor") == padrao
    pg.locator('#detalhes [data-tagbarra="1"]').check()                                       # Cursando na barra
    pg.locator('#detalhes [data-tagstatus="1"]').select_option("pendente")                    # vira "Não conta": perde a opção
    assert pg.locator('#detalhes [data-tagbarra="1"]').count() == 0 and not ls(pg, "tags")[1].get("barra")
    pg.locator('#detalhes [data-tagcor="2"]').evaluate("(el) => { el.value = '#0d9488'; el.dispatchEvent(new Event('change', { bubbles: true })); }")
    pg.locator('#detalhes [data-tagbarra="2"]').check()
    foto(pg, "barra-quatro-trechos-editor")
    exportado = pg.evaluate("() => GradeInterativa.perfilExportado()")
    assert [bool(x.get("barra")) for x in exportado["tags"]] == [False, False, True, False], exportado["tags"]
    pg.reload(); pg.wait_for_load_state("load"); pronto(pg, "barra-quatro")
    assert pg.evaluate("getComputedStyle(document.querySelector('#barra-geral .seg-plan')).backgroundColor") == "rgb(13, 148, 136)"
    ctx.close()
    ctx, pg = abre(b, perfil=exportado, nome="barra-quatro-reimporta")
    assert [bool(x.get("barra")) for x in pg.evaluate("() => GradeInterativa.perfilExportado()")["tags"]] == [False, False, True, False]
    ctx.close()

@caso("Tags: marcar 'Usar a cor desta tag na barra' pelo teclado mantém o foco; Tab segue para o próximo controle")
def t_tags_barra_teclado(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="tags-barra-teclado")
    pg.click("#btn-tags")
    pg.locator('#detalhes [data-tagbarra="0"]').focus(); pg.keyboard.press("Space")
    expect(pg.locator('#detalhes [data-tagbarra="0"]')).to_be_checked()
    foco = pg.evaluate("document.activeElement.dataset.tagbarra ?? document.activeElement.tagName")
    pg.keyboard.press("Tab")
    depois = pg.evaluate("document.activeElement.dataset.tagcor ?? document.activeElement.tagName")
    pg.keyboard.press("Shift+Tab"); pg.keyboard.press("Space")                           # desmarca pelo teclado
    expect(pg.locator('#detalhes [data-tagbarra="0"]')).not_to_be_checked()
    de_novo = pg.evaluate("document.activeElement.dataset.tagbarra ?? document.activeElement.tagName")
    ctx.close()
    assert (foco, depois, de_novo) == ("0", "1", "0"), (foco, depois, de_novo)

@caso("Cadeado: só ícone com nome acessível, começa desligado e lembra; protege cursadas e aprovadas do perfil; detalhes e destaque continuam")
def t_cadeado(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="cadeado")
    cad = pg.locator("#cadeado")
    assert cad.get_attribute("aria-label") == "Proteger disciplinas cursadas" and cad.get_attribute("aria-pressed") == "false" and not cad.locator(".so-texto").is_visible()
    pg.click('[data-pincel="cursando"]'); pg.locator('.card[data-code="EEL871"]').click()     # sem cadeado: pinta normalmente
    assert ls(pg, "marcacoes")["EEL871"] == "cursando"
    pg.click('[data-pincel="aprovada"]'); pg.locator('.card[data-code="COS471"]').click()     # marcada como Cursada
    cad.focus(); pg.keyboard.press("Enter")
    expect(pg.locator("#cadeado")).to_have_attribute("aria-pressed", "true"); assert ls(pg, "cadeado") is True
    expect(pg.locator('.card[data-code="COS110"]')).to_have_class(re.compile(r"(^| )protegida( |$)"))
    assert pg.locator("#painel .card .cad, #painel .card svg.lucide-lock").count() == 0, "cartão protegido com ícone de cadeado"
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
    pg.keyboard.press("Escape"); completo(pg, "grade"); escolhe_trilha(pg, "foco")
    pg.locator('.card[data-code="COS110"]').hover(); assert pg.locator("#painel .card.hl-self").count() == 1
    ctx.close()


CASOS2 = [t_plano_preservado, t_aviso_pdf, t_destaque, t_destaque_migracao, t_tags, t_tags_nao_conta, t_barra_quatro_trechos, t_tags_barra_teclado, t_cadeado]

# ================================================================== cenários do terceiro kit de revisão
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

@caso("Aparência: Ícone + texto (padrão), Só ícones e Minimalista nas abas e atalhos; nomes acessíveis, aba ativa e foco; desktop e celular")
def t_formatos(b):
    for vp, toque, nome in [(D, False, "desktop"), (C, True, "celular")]:
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, extra={"modoClassico": False, "vista": "timeline"}, nome=f"formatos-{nome}", toque=toque)
        tab = pg.locator('.abas [data-vista="timeline"]'); atal = pg.locator("#btn-privacidade")
        vis = lambda el, s: el.locator(s).evaluate("e => { const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 2; }")
        assert vis(tab, ".ico") and vis(tab, ".rot") and vis(atal, ".ico") and vis(atal, ".rot")
        abre_config(pg)
        rotulos = pg.locator('#dlg-config input[name="aparencia"]').evaluate_all("es => es.map((e) => e.closest('label').textContent.trim())")
        assert rotulos == ["Ícone + texto", "Só ícones", "Minimalista"], rotulos
        for nivel in ("icone", "minimalista"):
            if not pg.locator("#dlg-config").is_visible(): abre_config(pg)
            pg.check(f'#dlg-config input[name="aparencia"][value="{nivel}"]'); pg.keyboard.press("Escape")
            assert ls(pg, "aparencia") == nivel
            assert vis(tab, ".ico") and not vis(tab, ".rot") and vis(atal, ".ico") and not vis(atal, ".rot"), nivel
            expect(pg.get_by_role("tab", name="Linha do tempo")).to_have_attribute("aria-selected", "true")
            expect(pg.get_by_role("button", name="Privacidade")).to_be_visible()
            expect(pg.get_by_role("button", name="Configurações")).to_be_visible()
            assert pg.get_by_role("tab", name="Optativas").get_attribute("title") == "Optativas"      # o nome aparece ao passar o mouse
            pg.get_by_role("tab", name="Optativas").focus(); pg.keyboard.press("Shift+Tab"); pg.keyboard.press("Tab")
            assert pg.evaluate("getComputedStyle(document.activeElement).outlineStyle") == "solid"
            if toque:
                for el in pg.locator(".acoes .btn:not([hidden]), .abas button:not([hidden])").all():   # a aba Conquistas fica oculta fora do Foco
                    r = el.bounding_box(); assert r["height"] >= 44 and r["width"] >= 44, r
            foto(pg, f"52-{nivel}-{nome}")
        pg.reload(); assert pg.evaluate("document.documentElement.dataset.aparencia") == "minimalista"
        abre_config(pg); assert pg.locator('#dlg-config input[name="aparencia"][value="minimalista"]').is_checked()
        pg.check('#dlg-config input[name="aparencia"][value="icone-texto"]'); assert ls(pg, "aparencia") is None
        pg.keyboard.press("Escape"); assert vis(tab, ".rot") and vis(atal, ".rot")
        ctx.close()

@caso("Aparência legada: seletor só com ícones ligado vira Só ícones; desligado e 'Somente texto' viram Ícone + texto; a chave antiga sai depois de salvar")
def t_aparencia_migracao(b):
    casos = [({"seletorIcones": True}, "icone", "icone"), ({"seletorIcones": False}, None, "icone-texto"),
             ({"seletorIcones": False, "aparencia": "icone"}, "icone", "icone"), ({"aparencia": "texto"}, None, "icone-texto"),
             ({"seletorIcones": True, "aparencia": "texto"}, "icone", "icone")]
    for extra, salvo, aplicado in casos:
        ctx, pg = abre(b, perfil=PERFIL, extra=extra, nome="aparencia-migracao")
        assert ls(pg, "seletorIcones") is None, extra                                   # removida depois de gravar a nova
        assert ls(pg, "aparencia") == salvo, (extra, ls(pg, "aparencia"))
        assert pg.evaluate("document.documentElement.dataset.aparencia") == aplicado, extra
        rot = pg.locator("#seletor-modo .rot").first.evaluate("e => e.getBoundingClientRect().width")
        assert (rot <= 1) == (aplicado == "icone"), (extra, rot)                           # o seletor segue o nível
        expect(pg.get_by_role("radio", name="Clássico")).to_have_count(1)                  # nome acessível preservado
        abre_config(pg); assert pg.locator(f'#dlg-config input[name="aparencia"][value="{aplicado}"]').is_checked(), extra
        ctx.close()
    # sem poder gravar, a chave antiga fica e o nível vale nesta visita
    ctx, pg = abre(b, perfil=PERFIL, extra={"seletorIcones": True}, nome="aparencia-migracao-sem-gravar")
    pg.evaluate("""() => { localStorage.removeItem('gradeECI.v2.aparencia'); localStorage.setItem('gradeECI.v2.seletorIcones', 'true'); }""")
    pg.add_init_script("""Storage.prototype.setItem = function () { throw new Error('cheio'); };""")
    pg.reload(); pg.wait_for_load_state("load"); pronto(pg, "aparencia-migracao-sem-gravar")
    assert pg.evaluate("document.documentElement.dataset.aparencia") == "icone"
    assert pg.evaluate("localStorage.getItem('gradeECI.v2.seletorIcones')") == "true"
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

@caso("Modo: primeira visita no Clássico com seletor e tema; ocultar o seletor vale no Planejador; no Clássico o seletor e o tema ficam sempre visíveis e a preferência continua salva")
def t_modo(b):
    ctx, pg = abre(b, nome="modo", atalhos=False, modo="classico")
    assert pg.locator("#modo-classico").is_checked() and pg.locator("#seletor-modo").is_visible() and pg.locator("#btn-tema").is_visible()
    alterna_modo(pg)
    abre_config(pg); assert pg.locator('#dlg-config input[name="modo"][value="completo"]').is_checked() and pg.locator("#cfg-seletor").is_checked()
    pg.uncheck("#cfg-seletor")
    assert ls(pg, "ocultarSeletor") is True and pg.locator("#seletor-modo").is_hidden()
    pg.keyboard.press("Escape")
    assert pg.locator(".abas").is_visible() and pg.locator("#seletor-modo").is_hidden() and ls(pg, "modoClassico") is False
    foto(pg, "55-seletor-oculto-modo-completo")
    pg.reload(); assert pg.locator(".abas").is_visible() and pg.locator("#seletor-modo").is_hidden()
    # trocar para o Clássico em Configurações com o seletor oculto: no Clássico ele aparece, e a chave continua
    abre_config(pg); pg.check('#dlg-config input[name="modo"][value="classico"]'); pg.keyboard.press("Escape")
    expect(pg.locator("#seletor-modo")).to_be_visible(); expect(pg.locator("#btn-tema")).to_be_visible()
    assert pg.locator("#modo-classico").is_checked() and ls(pg, "ocultarSeletor") is True and ls(pg, "atalhos") in (None, [])
    pg.reload(); pronto(pg, "modo")
    expect(pg.locator("#seletor-modo")).to_be_visible(); assert ls(pg, "ocultarSeletor") is True
    pg.locator("#modo-classico").focus(); pg.keyboard.press("ArrowRight")                     # operável pelo teclado
    expect(pg.locator(".abas")).to_be_visible(); expect(pg.locator("#seletor-modo")).to_be_hidden()   # de volta ao Planejador, vale a preferência
    assert pg.locator("#btn-tema").count() == 0                                                # o tema não estava fixado
    abre_config(pg); pg.check("#cfg-seletor"); pg.keyboard.press("Escape")
    assert pg.locator("#seletor-modo").is_visible() and ls(pg, "ocultarSeletor") is False
    ctx.close()

@caso("Configurações sincroniza Grade → Exibir, destaque e o cadeado da paleta, nos dois sentidos; preferências antigas preservadas")
def t_sync(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "exibir": {"codigo": False, "notas": True, "setas": "foco"},
                                            "tags": [{"id": "minha", "nome": "Quero fazer", "cor": "#0891b2", "status": "planejado"}]}, nome="sync")
    abre_config(pg)
    assert not pg.locator('#dlg-config [data-exibir="codigo"]').is_checked() and pg.locator('#dlg-config [data-exibir="notas"]').is_checked()
    assert pg.locator('#dlg-config input[name="destaque"][value="foco"]').is_checked()            # setas "foco" antiga → Ao passar o mouse
    pg.check('#dlg-config [data-exibir="dificuldade"]'); pg.check('#dlg-config input[name="destaque"][value="desligado"]'); pg.check("#cfg-cadeado")
    pg.keyboard.press("Escape")
    assert aceso(pg.locator('#ferramentas [data-exibir="dificuldade"]')) and trilha(pg, "desligado").is_checked()
    assert pg.locator("#cadeado").get_attribute("aria-pressed") == "true"
    pg.click("#cadeado"); escolhe_trilha(pg, "foco")
    abre_config(pg); assert not pg.locator("#cfg-cadeado").is_checked() and pg.locator('#dlg-config input[name="destaque"][value="foco"]').is_checked()
    pg.keyboard.press("Escape")
    assert pg.locator("#paleta").inner_text().strip().startswith("Detalhes") and "Quero fazer" in pg.locator("#paleta").inner_text()   # tags personalizadas
    ctx.close()

EXPS = ["COS110", "COS242", "EEL873"]
def foco_devolvido(pg, code, ms=3000):
    """O <dialog> devolve o foco ao fechar: em alguns motores a leitura logo após o evento ainda vê o próprio <dialog>
    (6–10 ms depois o foco já está no cartão). Espera dirigida pela devolução e mantém o mesmo oráculo."""
    try:
        pg.wait_for_function("(c) => !!document.activeElement && !!document.activeElement.dataset && document.activeElement.dataset.code === c", arg=code, timeout=ms)
    except Exception:
        pass
    atual = pg.evaluate("document.activeElement && document.activeElement.dataset && document.activeElement.dataset.code")
    assert atual == code, (code, atual, pg.evaluate("document.activeElement ? document.activeElement.outerHTML.slice(0, 80) : 'nada'"))

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
        foco_devolvido(pg, "COS242")
        pg.locator('.card[data-code="EEL873"]').click(); pg.click("#eci-voltar"); expect(dlg).to_be_hidden()
        foco_devolvido(pg, "EEL873")
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

CASOS3 = [t_fecha_durante_leitura, t_previa_confirmacao, t_previa_download, t_formatos, t_aparencia_migracao, t_atalhos, t_modo, t_sync, t_seletor_eci, t_experiencias, t_exp_com_perfil]

CASOS = [
    t_descartar_salvo, t_tema, t_tema_abas, t_sem_perfil, t_seletor_modo, t_importar_sugere_planejador, t_criar_perfil, t_perfil_conflito,
    t_compat, t_siga, t_siga_sem_boa, t_excluir, t_periodo_janela, t_config_fechar, t_oferta, t_mac,
    t_cr01_pre, t_cr01_co, t_cr01_sugestoes, t_cr01_proposta, t_cr01_equivalencia, t_cr05_transferida_requisito, t_timeline_detalhes_e_clique, t_timeline_transferidas, t_timeline_bloco_vazio, t_timeline_ocorrencia, t_timeline_ocorrencia_mesma_coluna, t_timeline_ocorrencia_edicao, t_nome_sem_espaco, t_timeline_transferida_origem, t_eci_timeline, t_cr01_manual,
    t_cr03_historico, t_cr03_lista,
    t_cr04_reingresso, t_cr04_ordem_dos_arquivos, t_cr04_escolha_sem_datas, t_pc05_datas_ausentes, t_cr04_troca_recalcula_planos, t_cr04_ace_duas_ocorrencias, t_cr04_controles, t_pc05_perfil_antigo_duvida, t_cr04_papel, t_cr04_fronteira,
    t_cr02_pedidos, t_cr02_duas_dispensas, t_cr02_dispensa_unica, t_cr02_alvo_fora_do_catalogo,
    t_d02_dois_numeros, t_pedidos_sem_total_e_sem_check, t_d02_ausente_e_vazia, t_d02_outros_grupos, t_d02_importacao,
    t_rf08_faixa, t_sobre, t_detalhamento_info, t_rf08_notas_credito, t_rf08_periodo_atual, t_rf08_deduzido_regras, t_rf08_oferta, t_rf08_rodape, t_versao_antiga, t_rf08_ace,
    t_abas_legendas, t_pc02_manual_credito, t_pc03_manual_requisito,
    t_d01_carga, t_d01_conteudo,
    t_regressao, t_a11y,
] + CASOS2 + CASOS3

# ---- B2.5: UX e acessibilidade

# ------------------------------------------------------------------ B2.5: UX e acessibilidade (inspeção de 26/11/2026)
import os
AXE = pathlib.Path(os.environ.get("GRADE_AXE") or (FX.parents[2] / ".b11-runtime" / "axe" / "node_modules" / "axe-core" / "axe.min.js"))
C320 = {"width": 320, "height": 720}
TAGS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

def axe_roda(pg, regras=None, contexto=None):
    """Roda o axe-core (instalado fora do repositório; ver testes/README.md) e devolve as violações."""
    if not AXE.exists():
        raise AssertionError(f"axe-core não encontrado em {AXE}: defina GRADE_AXE com o caminho de axe.min.js")
    if pg.evaluate("typeof window.axe") != "object":
        pg.evaluate(AXE.read_text(encoding="utf-8"))
    opcoes = {"runOnly": {"type": "rule", "values": regras}} if regras else {"runOnly": {"type": "tag", "values": TAGS_AXE}}
    opcoes["preload"] = False      # sem pré-carga de folhas de estilo por XHR (bloqueada em file:// e vista como falha de recurso)
    pg.evaluate("Promise.all(document.getAnimations().map((a) => a.finished.catch(() => 0)))")    # transições e animações terminadas: o axe mede a cor final
    pg.wait_for_timeout(250)
    return pg.evaluate("""([ctx, o]) => axe.run(ctx || document, o).then((r) => r.violations.map((v) =>
        ({ id: v.id, impacto: v.impact, nos: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n').slice(1, 2).join(' ')).slice(0, 5) })))""", [contexto, opcoes])

def axe_graves(pg, regras=None, contexto=None):
    return [v for v in axe_roda(pg, regras, contexto) if v["impacto"] in ("serious", "critical")]

SEM_NOME = """(raiz) => {
  const nome = (el) => {
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = lb.split(/\\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join(' ').trim(); if (t) return t; }
    const al = (el.getAttribute('aria-label') || '').trim(); if (al) return al;
    const rot = [...(el.labels || [])].map((l) => l.textContent).join(' ').trim(); if (rot) return rot;
    if (el.tagName === 'BUTTON') return (el.textContent || '').trim() || (el.title || '').trim();
    return (el.getAttribute('title') || '').trim();
  };
  const r = document.querySelector(raiz);
  return [...r.querySelectorAll('input:not([type=hidden]), select, textarea, button')]
    .filter((e) => !e.closest('[hidden]') && e.getClientRects().length).filter((e) => !nome(e)).map((e) => e.outerHTML.slice(0, 90));
}"""

CORRUPTO = {"name": "invalido.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4\nnao e um historico"}

def aciona_importar(pg):
    pg.focus("#btn-importar"); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes")).to_be_visible()

def foco_em(pg, seletor): return pg.evaluate("(s) => !!document.activeElement && document.activeElement.matches(s)", seletor)
def descreve_foco(pg): return pg.evaluate("document.activeElement ? document.activeElement.outerHTML.slice(0, 90) : 'nada'")



@caso("B1: ícone de estado no cartão (✓ ◐ ○ … ✎), situação e origem no nome acessível; no toque a primeira ativação só consulta")
def t_b1_estado_dos_cartoes(b):
    # PC-08 e WCAG 1.4.1: o cartão mostra um ícone de estado, não o texto; situação e origem ficam no nome acessível.
    esperado = {"COS110": ("aprovado", "Aprovada · perfil"), "MAC118": ("previsto", "Aprovação prevista · perfil"),
                "MAC128": ("cursando", "Cursando · perfil"), "COS360": ("planejado", "Planejada · perfil"), "MAC238": ("marcacao", "Cursada · marcação")}
    visivel = """(el) => { const c = el.cloneNode(true); c.querySelectorAll('.sr').forEach((x) => x.remove()); return c.textContent; }"""
    for nome, vp, toque, esquema in [("desktop", D, False, "light"), ("celular", C320, True, "dark")]:
        ctx, pg = abre(b, vp=vp, esquema=esquema, perfil=PERFIL, extra={"marcacoes": {"MAC238": "aprovada"}, "vista": "grade"}, nome=f"b1-{nome}", toque=toque)
        for vista in ("grade", "timeline"):
            if vista == "timeline": completo(pg, "timeline")
            for code, (ico, texto) in esperado.items():
                if vista == "timeline" and code == "MAC238": continue             # sem período: a marcação só aparece na Grade
                cards = pg.locator(f'#painel .card[data-code="{code}"]'); card = cards.first if vista == "grade" else cards.last
                est = card.locator(".estado")
                assert est.get_attribute("data-estado") == ico and est.get_attribute("aria-hidden") == "true" and est.locator("svg.ico").count() == 1, (vista, code, est.get_attribute("data-estado"))
                rotulo = texto if vista == "grade" else texto.split(" · ")[0]
                expect(card).to_have_accessible_name(re.compile(re.escape(rotulo)))
                vis = card.evaluate(visivel)
                assert rotulo.split(" · ")[0] not in vis and " · perfil" not in vis and " · marcação" not in vis, (vista, code, vis)
            if vista == "grade":
                assert pg.locator('#painel .card[data-code="MAC248"] .estado').count() == 0
                foto(pg, f"b1-icones-{nome}")
        ctx.close()
    # toque, primeira visita: a 1ª ativação consulta (situação e origem em texto) e só a 2ª marca
    ctx, pg = abre(b, vp=C320, nome="b1-toque", toque=True, atalhos=False, modo="classico")
    card = pg.locator('.card[data-code="MAC248"]')
    card.tap()
    assert ls(pg, "marcacoes") in (None, {}), ls(pg, "marcacoes")
    consulta = pg.locator("#consulta"); expect(consulta).to_be_visible()
    texto = consulta.inner_text()
    assert "MAC248" in texto and "sem marcação" in texto and "Toque de novo" in texto, texto
    r = consulta.bounding_box(); assert r["height"] > 0
    card.tap()
    assert ls(pg, "marcacoes") == {"MAC248": "aprovada"}, ls(pg, "marcacoes")
    assert card.locator(".estado").count() == 0 and card.locator(".meta").count() == 0       # Clássico: só cor e nome
    expect(card).to_have_accessible_name(re.compile("Cursada · marcação"))                   # a situação continua no nome acessível
    ctx.close()
    # mouse e teclado continuam marcando com uma ativação
    ctx, pg = abre(b, nome="b1-mouse", atalhos=False, modo="classico")
    pg.locator('.card[data-code="MAC248"]').click(); assert ls(pg, "marcacoes") == {"MAC248": "aprovada"}
    ctx.close()

@caso("B2: importação válida, inválida e ambígua com o teclado: foco entra no painel, segue para o resultado e volta ao disparador")
def t_b2_importacao(b):
    ctx, pg = abre(b, nome="b2-valida", relogio=RELOGIO)
    gatilho = pg.locator("#btn-importar")
    aciona_importar(pg)
    assert pg.evaluate("document.activeElement.closest('#detalhes') !== null"), "o foco ficou fora do painel: " + descreve_foco(pg)
    pg.keyboard.press("Escape"); expect(pg.locator("#detalhes")).to_be_hidden(); expect(gatilho).to_be_focused()
    aciona_importar(pg)
    pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in ("historico-ficticio.pdf", "boa-ficticio.pdf")])
    pg.focus("#siga-gerar"); pg.keyboard.press("Enter")
    pg.wait_for_selector("#siga-usar", timeout=30000)
    assert foco_em(pg, ".resumo-import h4"), "o foco não foi para o resultado: " + descreve_foco(pg)
    assert "Prévia" in pg.locator("#anuncio").inner_text(), pg.locator("#anuncio").inner_text()
    pg.focus("#siga-usar"); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes")).to_be_hidden()
    expect(gatilho).to_be_focused()
    ctx.close()
    # perfil salvo e menu sem atalhos: Configurações → Importar do SIGA leva o foco ao painel e guarda Configurações como retorno
    def abre_pelo_menu(pg):
        pg.focus("#btn-config"); pg.keyboard.press("Enter"); expect(pg.locator("#dlg-config")).to_be_visible()
        pg.focus('[data-abrir-atalho="importar"]'); pg.keyboard.press("Enter")
        expect(pg.locator("#detalhes")).to_be_visible(); expect(pg.locator("#dlg-config")).to_be_hidden()
    def controle_visivel(pg, seletor):
        assert foco_em(pg, seletor), "o foco não voltou a " + seletor + ": " + descreve_foco(pg)
        assert pg.evaluate("document.activeElement.getClientRects().length > 0"), "controle sem caixa: " + descreve_foco(pg)
    ctx, pg = abre(b, perfil=PERFIL, atalhos=False, nome="b2-menu", relogio=RELOGIO)
    assert pg.locator("#btn-importar").count() == 0
    abre_pelo_menu(pg)
    assert foco_em(pg, "#detalhes h3"), "o foco não entrou no painel: " + descreve_foco(pg)
    pg.keyboard.press("Tab")
    assert pg.evaluate("document.activeElement.closest('#detalhes') !== null"), "o Tab saiu do painel: " + descreve_foco(pg)
    pg.keyboard.press("Escape"); expect(pg.locator("#detalhes")).to_be_hidden(); controle_visivel(pg, "#btn-config")
    abre_pelo_menu(pg)
    pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in ("historico-ficticio.pdf", "boa-ficticio.pdf")])
    pg.focus("#siga-gerar"); pg.keyboard.press("Enter")
    pg.wait_for_selector("#siga-usar", timeout=30000)
    pg.focus("#siga-usar"); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes")).to_be_hidden(); controle_visivel(pg, "#btn-config")
    ctx.close()
    # primeira importação sem atalho fixado: o botão do topo some ao usar o perfil e o foco vai a Configurações
    ctx, pg = abre(b, atalhos=False, nome="b2-primeira", relogio=RELOGIO)
    aciona_importar(pg)
    pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in ("historico-ficticio.pdf", "boa-ficticio.pdf")])
    pg.focus("#siga-gerar"); pg.keyboard.press("Enter")
    pg.wait_for_selector("#siga-usar", timeout=30000)
    pg.focus("#siga-usar"); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes")).to_be_hidden(); assert pg.locator("#btn-importar").count() == 0
    controle_visivel(pg, "#btn-config")
    ctx.close()
    # inválida: o botão volta a ter o foco depois da leitura (desativado durante ela)
    ctx, pg = abre(b, nome="b2-invalida")
    aciona_importar(pg)
    pg.set_input_files("#siga-pdfs", files=[CORRUPTO])
    pg.focus("#siga-gerar"); pg.keyboard.press("Enter")
    pg.wait_for_selector("#siga-status a", timeout=30000)
    assert pg.evaluate("document.activeElement.closest('#detalhes') !== null"), "foco perdido após o erro: " + descreve_foco(pg)
    pg.keyboard.press("Escape"); expect(pg.locator("#detalhes")).to_be_hidden(); expect(pg.locator("#btn-importar")).to_be_focused()
    ctx.close()
    # ambígua: o resultado recebe o foco; Tab chega ao primeiro rádio; a escolha por teclado mantém o foco
    ctx, pg = abre(b, perfil=PEDIDO_MAC118, nome="b2-ambigua", relogio=RELOGIO)
    gera(pg, [f"{n}.pdf" for n in ORACULOS["duvida-sem-datas"]["arquivos"]])
    assert foco_em(pg, ".resumo-import h4"), descreve_foco(pg)
    for _ in range(12):
        pg.keyboard.press("Tab")
        if foco_em(pg, 'input[name="siga-papel"]'): break
    assert foco_em(pg, 'input[name="siga-papel"]'), descreve_foco(pg)
    pg.keyboard.press("Space")
    expect(pg.locator("#siga-usar")).to_be_enabled()
    assert foco_em(pg, 'input[name="siga-papel"]:checked'), descreve_foco(pg)
    ctx.close()

@caso("B2: filtros de Optativas e seleção no Cronograma mantêm o foco no controle acionado")
def t_b2_foco_filtros(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "optativas"}, nome="b2-filtros")
    for sel in ('[data-fcheck="liberadas"]', '[data-fcheck="ocultarFeitas"]', '[data-fgrupo="4"]', '[data-fgrupo="2"]', '[data-fprefixo]:nth-of-type(2)'):
        pg.locator(sel).first.focus(); pg.keyboard.press("Space" if "fcheck" in sel else "Enter")
        pg.wait_for_timeout(60)
        assert pg.evaluate("document.activeElement !== document.body"), (sel, "foco no body")
        assert pg.evaluate("(s) => document.activeElement === document.querySelector(s)", sel.replace(":nth-of-type(2)", ":nth-of-type(2)")) or foco_em(pg, sel.split(":")[0]), (sel, descreve_foco(pg))
    pg.click('[data-vista="cronograma"]')
    for sel in ('[data-cperiodo="2027/1"]', '[data-csel="COS360"]', '[data-cperiodo="2027/2"]'):
        pg.locator(sel).focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(60)
        assert foco_em(pg, sel), (sel, descreve_foco(pg))
    # o clique num cartão sempre abre os detalhes (o foco por clique não pode rolar a página: no WebKit o clique se perdia)
    pg.click('[data-vista="grade"]')
    for i in range(12):
        pg.reload(); pg.wait_for_load_state("load")
        pg.locator('.card[data-code="MAC128"]').click()
        expect(pg.locator("#detalhes")).to_be_visible(timeout=2000)
        pg.keyboard.press("Escape")
    ctx.close()

PONTO_OCULTO = """() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;     // o fim da ordem de Tab passa pelo documento (WebKit): não é cartão encoberto
  if (el.closest('.paleta, #detalhes, dialog')) return null;
  const alvo = el.matches('.seletor-modo input') ? el.closest('label') : el;    // o rádio do seletor fica oculto; o rótulo mostra o foco
  const rs = [...alvo.getClientRects()]; const r = rs.reduce((m, q) => (q.width * q.height > m.width * m.height ? q : m), rs[0] || alvo.getBoundingClientRect());
  if (!r.width || !r.height) return 'sem caixa: ' + el.outerHTML.slice(0, 70);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;   // link quebrado em duas linhas: o centro da maior linha
  if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return 'fora da janela: ' + el.outerHTML.slice(0, 70);
  const topo = document.elementFromPoint(cx, cy);
  if (topo && (topo === alvo || alvo.contains(topo))) return null;
  return 'encoberto por ' + (topo ? (topo.id || topo.className || topo.tagName) : 'nada') + ': ' + el.outerHTML.slice(0, 70);
}"""

@caso("B2: foco visível após a rolagem, com faixa e paleta, em 320 px (Tab e Shift+Tab na Grade)")
def t_b2_foco_visivel(b):
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, nome="b2-visivel", toque=True, modo="classico")
    ruins = []
    for _ in range(70):
        pg.keyboard.press("Tab"); pg.wait_for_timeout(40)
        p = pg.evaluate(PONTO_OCULTO)
        if p: ruins.append(p)
    pg.locator("#link-credito").focus()
    for _ in range(70):
        pg.keyboard.press("Shift+Tab"); pg.wait_for_timeout(40)
        p = pg.evaluate(PONTO_OCULTO)
        if p: ruins.append("(Shift+Tab) " + p)
    assert not ruins, ruins[:6]
    # recarregar não rola a página (a margem de rolagem de cima, em CSS, fazia o Chromium rolar 10 px a cada recarga).
    # Só no Chromium: o WebKit restaura a posição salva de uma rolagem anterior ao recarregar, o que não vem da página.
    if b.browser_type.name == "chromium":
        rolagens = []
        pg.evaluate("window.scrollTo(0, 0)"); pg.wait_for_timeout(150)
        for _ in range(12):
            pg.reload(); pg.wait_for_load_state("load")
            rolagens.append(pg.evaluate("window.scrollY"))
        assert not any(rolagens), rolagens
    ctx.close()

@caso("M6: o efeito 'somente informativo': turmas sem código só informam cabe/choca; códigos fora do currículo ficam fora de sugestões e cálculos")
def t_m6_somente_informativo(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "optativas"}, nome="m6-informativo")
    antes = pg.evaluate("JSON.stringify(window.GradeInterativa.totais())")
    pg.locator('[data-falvo]').select_option("2027/1")
    lista = pg.locator(".sem-codigo")
    assert lista.count() == 1
    txt = lista.inner_text()
    assert "Mapas (livre escolha)" in txt and ("cabe" in txt or "choca" in txt), txt
    assert lista.locator("button, [data-plan], [data-sugadd]").count() == 0       # nada para planejar ou incluir
    assert "Outras turmas na referência de 2027/1" in pg.locator("#painel").inner_text()
    cos013 = pg.locator('.opt[data-code="COS013"]')                # "Comp 3" agora é a COS013, com horário e selo de referência
    assert cos013.count() == 1
    assert "ter 13-15, qui 13-15" in cos013.locator(".hor").inner_text() and "/1" in cos013.locator(".selo").inner_text()
    pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/1"]')
    sug = pg.locator(".lista-sug").inner_text()
    for fora in ("EET100", "EEL891", "Mapas", "Estrutura de Dados"): assert fora not in sug, (fora, sug)
    pg.click('[data-cperiodo="2027/2"]')
    sug = pg.locator(".lista-sug").inner_text()
    for fora in ("EET100", "EEL891", "Grafos de Interseção"): assert fora not in sug, (fora, sug)
    assert pg.evaluate("JSON.stringify(window.GradeInterativa.totais())") == antes        # os totais não mudam
    ctx.close()

@caso("B3: nomes acessíveis do seletor de PDF e dos campos de ACE e Pedidos; prévia anunciada")
def t_b3_nomes(b):
    perfil = perfil_carga(["COS231", "EEL881"], boa_com(("COS231", 60), ("EEL881", 60)))
    perfil["extensao"] = [{"nome": "Projeto fictício", "code": "", "horas": 30, "periodo": "2026/1", "status": "validada"}]
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome="b3-pedidos")
    assert pg.evaluate(SEM_NOME, "#painel") == [], pg.evaluate(SEM_NOME, "#painel")
    ctx.close()
    ctx, pg = abre(b, nome="b3-importador", relogio=RELOGIO)
    pg.click("#btn-importar")
    assert pg.evaluate(SEM_NOME, "#detalhes") == [], pg.evaluate(SEM_NOME, "#detalhes")
    nome = pg.locator("#siga-pdfs").evaluate("e => e.getAttribute('aria-label') || (e.labels[0] && e.labels[0].textContent) || ''")
    assert "PDF" in nome and "Histórico" in nome and "BOA" in nome, nome
    pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in ("historico-ficticio.pdf", "boa-ficticio.pdf")]); pg.click("#siga-gerar")
    pg.wait_for_selector("#siga-usar", timeout=30000)
    assert pg.evaluate(SEM_NOME, "#detalhes") == [], pg.evaluate(SEM_NOME, "#detalhes")
    assert "Prévia pronta" in pg.locator("#anuncio").inner_text(), pg.locator("#anuncio").inner_text()
    assert pg.locator("#anuncio").get_attribute("role") == "status"
    ctx.close()

@caso("B4: grade de horários por teclado: configurar, ver o choque, limpar e buscar por faixa")
def t_b4_grade_horarios(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "cronograma", "cronoPeriodo": "2027/1"}, nome="b4-grade")
    assert pg.locator(".cel").count() == 45
    assert pg.locator('.cel[tabindex="0"]').count() == 1, "uma só célula entra na ordem de Tab (foco móvel)"
    pg.locator('[data-csel="COS360"]').focus(); pg.keyboard.press("Enter")
    pg.focus("#add-btn"); pg.keyboard.press("Tab")
    assert foco_em(pg, ".cel"), "Tab não chegou à grade: " + descreve_foco(pg)
    primeiro = pg.evaluate("document.activeElement.dataset.cel")
    pg.keyboard.press("ArrowRight"); pg.keyboard.press("ArrowLeft"); pg.keyboard.press("ArrowDown"); pg.keyboard.press("ArrowUp")
    assert pg.evaluate("document.activeElement.dataset.cel") == primeiro
    pg.keyboard.press("Home"); assert pg.evaluate("document.activeElement.dataset.cel") == "8"       # seg 08h
    nome = pg.evaluate("document.activeElement.getAttribute('aria-label')")
    assert "Segunda" in nome and "08" in nome, nome
    assert pg.evaluate("document.activeElement.matches(':focus-visible')")
    pg.keyboard.press("Space")                       # COS360 em seg 08h, onde EEL871 tem aula: choque
    assert foco_em(pg, '.cel[data-cel="8"]'), descreve_foco(pg)
    assert "seg 08-09" in pg.locator('.crono-item:has([data-csel="COS360"])').inner_text()
    banner = pg.locator(".choques").inner_text(); assert "COS360" in banner and "EEL871" in banner and "seg" in banner, banner
    rot = pg.locator('.cel[data-cel="8"]').get_attribute("aria-label")
    assert "COS360" in rot and "EEL871" in rot and "choque" in rot.lower() and "Segunda" in rot, rot
    pg.keyboard.press("Space")                       # limpa
    assert "sem horário" in pg.locator('.crono-item:has([data-csel="COS360"])').inner_text()
    assert "Sem choques" in pg.locator(".choques").inner_text()
    pg.keyboard.press("Escape")
    # busca por faixa: célula vazia sem disciplina selecionada
    pg.locator('.cel[data-cel="315"]').focus(); pg.keyboard.press("Enter")
    assert "Quinta 15h" in pg.locator(".plano").inner_text(), pg.locator(".plano").inner_text()[:200]
    assert foco_em(pg, '.cel[data-cel="315"]'), descreve_foco(pg)
    pg.focus("#slot-limpar"); pg.keyboard.press("Enter")
    assert "Quinta 15h" not in pg.locator(".plano").inner_text()
    ctx.close()

@caso("B5: Escolher perfil por teclado (arquivo válido e inválido) e por toque, sem encobrimento pela paleta, em 320 e 390 px")
def t_b5_escolher_perfil(b):
    def procura_controle(pg):
        for _ in range(90):
            pg.keyboard.press("Tab")
            if pg.evaluate("(() => { const e = document.activeElement; return !!e && e.tagName !== 'BODY' && (e.id === 'importar' || /Escolher perfil/.test(e.textContent || '')); })()"): return True
        return False
    ctx, pg = abre(b, perfil=ANTIGO, nome="b5-teclado")
    aciona_importar(pg)
    assert procura_controle(pg), "Tab não alcança Escolher perfil: " + descreve_foco(pg)
    with pg.expect_file_chooser(timeout=5000) as fc:
        pg.wait_for_timeout(200)       # deixa a interceptação do seletor de arquivo ativa antes da tecla
        pg.keyboard.press("Enter")
    fc.value.set_files({"name": "perfil.json", "mimeType": "application/json", "buffer": json.dumps(PERFIL).encode()})
    expect(pg.locator("#titulo")).to_have_text(re.compile(r"Grade ECI — Ana"))
    antes = snapshot(pg)
    aciona_importar(pg)
    assert procura_controle(pg)
    pg.once("dialog", lambda d: d.accept())
    with pg.expect_file_chooser(timeout=5000) as fc:
        pg.wait_for_timeout(200)       # deixa a interceptação do seletor de arquivo ativa antes da tecla
        pg.keyboard.press("Enter")
    fc.value.set_files({"name": "perfil.json", "mimeType": "application/json", "buffer": b"isto nao e json"})
    pg.wait_for_timeout(400)
    assert snapshot(pg) == antes and "Ana" in pg.locator("#titulo").inner_text()      # o estado anterior fica
    ctx.close()
    for vp in (C320, C):
        ctx, pg = abre(b, vp=vp, perfil=ANTIGO, nome=f"b5-toque-{vp['width']}", toque=True)
        pg.locator("#btn-importar").tap()
        ctl = pg.locator("#detalhes").get_by_text("Escolher perfil.js / .json")
        ctl.scroll_into_view_if_needed()
        coberto = ctl.evaluate("""(e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                                  return !(t && (t === e || e.contains(t))) ? (t ? (t.id || t.className) : 'nada') : null; }""")
        assert coberto is None, f"encoberto por {coberto} a {vp['width']} px"
        with pg.expect_file_chooser(timeout=5000) as fc:
            pg.wait_for_timeout(200)
            ctl.tap()
        fc.value.set_files({"name": "perfil.json", "mimeType": "application/json", "buffer": json.dumps(PERFIL).encode()})
        expect(pg.locator("#titulo")).to_have_text(re.compile(r"Grade ECI — Ana"))
        ctx.close()

CONTRASTE = """(sels) => {
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (s) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = s; cv.fillRect(0, 0, 1, 1); const d = cv.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  const sobre = (f, base) => f[3] >= 1 ? f : [0, 1, 2].map((i) => f[i] * f[3] + base[i] * (1 - f[3])).concat([1]);
  const fundo = (el) => { const cadeia = []; for (let e = el; e; e = e.parentElement) cadeia.push(getComputedStyle(e).backgroundColor); let cor = [255, 255, 255, 1];
    for (const c of cadeia.reverse()) cor = sobre(rgba(c), cor); return cor; };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  return sels.map(([s, borda]) => { const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length); if (!el) return [s, null];
    const cs = getComputedStyle(el); const bg = fundo(el.parentElement || el);
    return [s, +(borda ? razao(sobre(rgba(cs.borderTopColor), bg), bg) : razao(sobre(rgba(cs.color), fundo(el)), fundo(el))).toFixed(2)]; });
}"""

@caso("B6: contraste ≥ 4,5:1 nos textos e ≥ 3:1 nos limites das células, nos dois temas; axe sem ocorrências de contraste")
def t_b6_contraste(b):
    for esq in ("light", "dark"):
        ctx, pg = abre(b, esquema=esq, perfil=PERFIL, extra={"modoClassico": False, "vista": "timeline"}, nome=f"b6-{esq}")
        ruins = []
        def mede(pares):
            for (sel, borda), (s, r) in zip(pares, pg.evaluate(CONTRASTE, [list(p) for p in pares])):
                limite = 3 if borda else 4.5
                if r is None: ruins.append((esq, s, "ausente"))
                elif r < limite: ruins.append((esq, s, r))
        pg.click("#bg-detalhes")                       # o detalhamento começa recolhido; mede aberto
        mede([(".prog-topo i", False), (".card.s-cursando .meta", False), (".chip-atual", False)])
        assert not axe_roda(pg, ["color-contrast"]), (esq, "timeline", axe_roda(pg, ["color-contrast"]))
        pg.click('[data-vista="optativas"]')
        mede([(".selo.ativa", False)])
        assert not axe_roda(pg, ["color-contrast"]), (esq, "optativas", axe_roda(pg, ["color-contrast"]))
        pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/1"]'); pg.click('[data-csel="COS360"]')
        pg.locator('.cel[data-cel="8"]').dispatch_event("mousedown"); pg.mouse.up()
        mede([(".choques", False), (".bloco-aula b", False), (".bloco-aula small", False), (".crono-grade .cel", True)])
        assert not axe_roda(pg, ["color-contrast"]), (esq, "cronograma", axe_roda(pg, ["color-contrast"]))
        pg.click('[data-vista="pedidos"]')
        assert not axe_roda(pg, ["color-contrast"]), (esq, "pedidos", axe_roda(pg, ["color-contrast"]))
        assert not ruins, ruins
        ctx.close()

@caso("B7: Pedidos sem rolagem horizontal do documento a 320 px; tabelas rolam só na própria região, acessível por teclado")
def t_b7_pedidos_320(b):
    perfil = perfil_carga(["COS231", "EEL881"], boa_com(("COS231", 60), ("EEL881", 60)))
    perfil["extensao"] = [{"nome": "Projeto de extensão fictício com nome longo", "code": "", "horas": 30, "periodo": "2026/1", "status": "validada"},
                          {"nome": "Outra atividade", "code": "", "horas": 60, "periodo": "2026/2", "status": "em andamento"}]
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C320, esquema=esq, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome=f"b7-{esq}", toque=True)
        larg = pg.evaluate("document.documentElement.scrollWidth"); assert larg <= 320, (esq, larg)
        regioes = pg.locator("#painel .tabela-rolagem")
        assert regioes.count() >= 3, regioes.count()
        for i in range(regioes.count()):
            r = regioes.nth(i)
            assert r.get_attribute("tabindex") == "0" and r.get_attribute("role") == "region" and r.get_attribute("aria-label"), r.evaluate("e => e.outerHTML.slice(0, 120)")
            assert r.evaluate("e => getComputedStyle(e).overflowX") in ("auto", "scroll")
        # rolagem por teclado na região da tabela de pedidos
        reg = regioes.nth(1)
        assert reg.evaluate("e => e.scrollWidth > e.clientWidth"), "a tabela de pedidos devia precisar de rolagem a 320 px"
        reg.focus(); pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(150)
        assert reg.evaluate("e => e.scrollLeft") > 0, "a rolagem por teclado não moveu a tabela"
        assert pg.evaluate("document.documentElement.scrollWidth") <= 320
        ctx.close()

@caso("B8: alvos de 24 × 24 CSS px nos botões de período, Usar e avisos de perfil; 44 px nos atalhos; axe target-size")
def t_b8_alvos(b):
    pequenos = []
    def mede(pg, sels, rotulo):
        for s in sels:
            for el in pg.locator(s).all():
                if not el.is_visible(): continue
                r = el.bounding_box()
                # 0,01 px de tolerância: em coordenadas grandes e fracionárias o Firefox mede 24 px como 23,9998 (erro de ponto flutuante)
                if r["width"] < 23.99 or r["height"] < 23.99: pequenos.append((rotulo, s, round(r["width"], 1), round(r["height"], 1)))
    for nome, vp, toque in [("desktop", D, False), ("celular", C320, True)]:
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, extra={"modoClassico": False, "vista": "optativas"}, nome=f"b8-{nome}", toque=toque)
        mede(pg, [".mini-btn", ".chip-btn", ".seg button", ".check input"], f"optativas-{nome}")
        pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/1"]')
        mede(pg, [".mini-btn", ".crono-pick", ".x"], f"cronograma-{nome}")
        assert not axe_graves(pg, ["target-size"]), (nome, "cronograma", axe_graves(pg, ["target-size"]))
        pg.click('[data-vista="optativas"]')
        assert not axe_graves(pg, ["target-size"]), (nome, "optativas", axe_graves(pg, ["target-size"]))
        pg.click('[data-vista="grade"]')          # aviso do perfil salvo (só no Planejador)
        mede(pg, ["#baixar-importado", "#descartar-importado", "#ferramentas .ctl.aceso"], f"aviso-{nome}")
        assert not axe_graves(pg, ["target-size"]), (nome, "aviso", axe_graves(pg, ["target-size"]))
        if toque:
            for s in ("#btn-importar", "#btn-perfil", "#seletor-modo label", ".pal-btn"):
                for el in pg.locator(s).all():
                    r = el.bounding_box(); assert r["height"] >= 44 and r["width"] >= 44, (s, r)
        ctx.close()
    assert not pequenos, pequenos

@caso("B9: abas com painel associado e teclado de abas; seleção sem aria-selected inválido; axe sem atributos ARIA inválidos")
def t_b9_aria(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade"}, nome="b9")
    abas = pg.locator('.abas [role="tab"]'); assert abas.count() == 7     # Conquistas existe, oculta fora do Foco
    ids = pg.evaluate("[...document.querySelectorAll('.abas [role=tab]')].map(e => e.id)")
    assert all(ids) and len(set(ids)) == 7, ids
    for v in ("grade", "timeline", "optativas", "cronograma", "pedidos", "eci"):
        pg.click(f'[data-vista="{v}"]')
        painel = pg.locator("#painel")
        assert painel.get_attribute("role") == "tabpanel", painel.get_attribute("role")
        assert painel.get_attribute("aria-labelledby") == f"aba-{v}", painel.get_attribute("aria-labelledby")
        assert pg.locator(f'#aba-{v}').get_attribute("aria-controls") == "painel"
        assert pg.locator('.abas [aria-selected="true"]').count() == 1 and pg.locator(f'#aba-{v}').get_attribute("aria-selected") == "true"
        assert pg.locator('.abas [role=tab][tabindex="0"]').count() == 1
        invalidos = pg.evaluate("""[...document.querySelectorAll('[aria-selected]')].filter((e) => !['tab', 'option', 'gridcell', 'row', 'columnheader', 'rowheader', 'treeitem'].includes(e.getAttribute('role'))).map((e) => e.outerHTML.slice(0, 80))""")
        assert not invalidos, (v, invalidos)
        graves = axe_roda(pg, ["aria-allowed-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-allowed-role", "aria-roles"])
        assert not graves, (v, graves)
    pg.click('[data-vista="grade"]'); pg.locator("#aba-grade").focus()
    pg.keyboard.press("ArrowRight"); assert foco_em(pg, "#aba-timeline") and pg.locator("#aba-timeline").get_attribute("aria-selected") == "true"
    pg.keyboard.press("End"); assert foco_em(pg, "#aba-eci") and pg.locator("#aba-eci").get_attribute("aria-selected") == "true"
    pg.keyboard.press("ArrowRight"); assert foco_em(pg, "#aba-grade")
    pg.keyboard.press("ArrowLeft"); assert foco_em(pg, "#aba-eci")
    pg.keyboard.press("Home"); assert foco_em(pg, "#aba-grade") and pg.locator("#painel").get_attribute("aria-labelledby") == "aba-grade"
    pg.click('[data-vista="optativas"]')
    assert pg.locator("[data-fgrupo][aria-selected]").count() == 0 and pg.locator("[data-fgrupo][aria-pressed]").count() == 3
    assert pg.locator("[data-fgrupo][aria-pressed=true]").count() == 1
    pg.click('[data-vista="cronograma"]')
    assert pg.locator("[data-cperiodo][aria-selected]").count() == 0 and pg.locator("[data-cperiodo][aria-pressed=true]").count() == 1
    ctx.close()

@caso("M3: falha de leitura do PDF em português com orientação, sem dados do arquivo; BOA por extenso na primeira menção")
def t_m3_mensagens(b):
    ctx, pg = abre(b, nome="m3", atalhos=False)
    pg.click("#btn-importar")
    painel = pg.locator("#detalhes").inner_text()
    assert "BOA (Boletim de Orientação Acadêmica)" in painel, painel
    assert painel.index("BOA") == painel.index("BOA (Boletim de Orientação Acadêmica)"), painel[:400]
    pg.set_input_files("#siga-pdfs", files=[CORRUPTO]); pg.click("#siga-gerar")
    pg.wait_for_selector("#siga-status a", timeout=30000)
    msg = pg.locator("#siga-status").inner_text()
    assert msg.startswith("Não deu certo: ") and "Invalid" not in msg and "invalido" not in msg.lower(), msg
    assert "PDF" in msg and "tente de novo" in msg and "Achou um erro? Crie uma nova issue" in msg, msg
    ctx.close()
    # linha acadêmica ilegível: a prévia avisa junto da contagem, sem trecho do documento; o controle fica limpo
    AVISO_LINHA = "1 linha(s) do Histórico não puderam ser lidas; confira a lista antes de usar o perfil."
    ctx, pg = abre(b, nome="m3-linha-parcial")
    gera(pg, ["historico-ficticio.pdf"])
    previa = pg.locator(".resumo-import").inner_text()
    assert "10 disciplinas aprovadas ou em curso" in previa and "não puderam ser lidas" not in previa, previa
    ctx.close()
    ctx, pg = abre(b, nome="m3-linha-parcial")
    gera(pg, ["historico-ficticio-colunas-a-menos.pdf"])
    previa = pg.locator(".resumo-import").inner_text()
    assert "9 disciplinas aprovadas ou em curso" in previa and AVISO_LINHA in previa, previa
    assert "COS111" not in previa and "Engenharia" not in previa, previa           # sem trecho do documento
    assert previa.index("disciplinas aprovadas") < previa.index("não puderam ser lidas") < previa.index("Usar este perfil"), previa
    assert pg.locator(".resumo-import .alerta", has_text="não puderam ser lidas").count() == 1
    ctx.close()

AXE_RECORTE = [("grade-classica", {"modoClassico": True}), ("grade-completa", {"modoClassico": False, "vista": "grade"}), ("linha-do-tempo", {"modoClassico": False, "vista": "timeline"}),
               ("optativas", {"modoClassico": False, "vista": "optativas"}), ("cronograma", {"modoClassico": False, "vista": "cronograma", "cronoPeriodo": "2027/1"}),
               ("pedidos", {"modoClassico": False, "vista": "pedidos"}), ("eci", {"modoClassico": False, "vista": "eci"})]

@caso("Axe-core no recorte da inspeção: sem ocorrências graves ou críticas (WCAG A/AA 2.0–2.2), nos dois temas, em 1440 e 320 px")
def t_axe_recorte(b):
    achados = []
    for esq in ("light", "dark"):
        for vp, rotulo in ((D, "1440"), (C320, "320")):
            for nome, extra in AXE_RECORTE:
                ctx, pg = abre(b, vp=vp, esquema=esq, perfil=PERFIL, extra=extra, nome=f"axe-{nome}", toque=rotulo == "320")
                if nome == "cronograma":
                    pg.click('[data-csel="COS360"]'); pg.locator('.cel[data-cel="8"]').dispatch_event("mousedown"); pg.mouse.up()
                for v in axe_graves(pg): achados.append((esq, rotulo, nome, v["id"], v["nos"][:2]))
                if nome == "grade-completa":
                    pg.locator('.card[data-code="COS242"]').click()          # detalhes da disciplina
                    for v in axe_graves(pg): achados.append((esq, rotulo, "detalhes-COS242", v["id"], v["nos"][:2]))
                    pg.keyboard.press("Escape")
                    pg.click("#btn-config")
                    for v in axe_graves(pg): achados.append((esq, rotulo, "configuracoes", v["id"], v["nos"][:2]))
                    pg.keyboard.press("Escape"); pg.click("#btn-importar")
                    for v in axe_graves(pg): achados.append((esq, rotulo, "importador", v["id"], v["nos"][:2]))
                    pg.set_input_files("#siga-pdfs", [str(PDFS / f) for f in ("historico-ficticio.pdf", "boa-ficticio.pdf")]); pg.click("#siga-gerar")
                    pg.wait_for_selector("#siga-usar", timeout=30000)
                    for v in axe_graves(pg): achados.append((esq, rotulo, "previa", v["id"], v["nos"][:2]))
                ctx.close()
    assert not achados, achados[:8]

CASOS4 = [t_axe_recorte, t_m3_mensagens, t_b9_aria, t_b8_alvos, t_b7_pedidos_320, t_b6_contraste, t_b5_escolher_perfil, t_b4_grade_horarios, t_b3_nomes, t_m6_somente_informativo, t_b2_foco_visivel, t_b2_foco_filtros, t_b2_importacao, t_b1_estado_dos_cartoes]
CASOS += CASOS4


# ------------------------------------------------------------------ v2.0.0: Aparência, controles e destaque
def larg_rot(loc): return loc.locator(".rot").evaluate("e => e.getBoundingClientRect().width")

@caso("Controles com ícone: Exibir, filtros de Optativas, + Período, Exportar perfil.js e Excluir período; Só ícones mantém nome e title")
def t_controles_icones(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade"}, nome="controles-icones")
    def mede(ctls, nivel):
        for c in ctls:
            assert c.locator(".ico").count() == 1 and c.get_attribute("title"), c
            w = larg_rot(c)
            assert (w > 4) if nivel == "icone-texto" else (w <= 1), (nivel, w, c)
    def confere(nivel):
        for k, nome in (("codigo", "Código e créditos"), ("notas", "Notas"), ("dificuldade", "Dificuldade"), ("presenca", "Presença"), ("plano", "Plano"), ("situacao", "Situação")):
            b = pg.get_by_role("button", name=nome, exact=True); expect(b).to_have_count(1)
            assert b.get_attribute("data-exibir") == k and b.get_attribute("aria-pressed") in ("true", "false"), k
            mede([b], nivel)
        assert pg.locator("#ferramentas input[type=checkbox]").count() == 0     # sem caixa de marcar
        completo(pg, "optativas")
        for nome in ("Só ativas", "Só liberadas", "Ocultar cursadas", "Todas acesas"):
            b = pg.get_by_role("button", name=nome, exact=True); expect(b).to_have_count(1)
            assert b.get_attribute("aria-pressed") in ("true", "false"), nome
            mede([b], nivel)
        assert pg.locator(".filtros input[type=checkbox]").count() == 0
        for nome in ("Condicionada", "Humanas", "ACE (extensão)"):
            mede([pg.get_by_role("button", name=nome, exact=True)], nivel)
        completo(pg, "cronograma"); pg.locator('[data-cperiodo="2027/1"]').click()
        for nome in ("Adicionar período", "Exportar perfil.js", "Excluir período"):
            mede([pg.get_by_role("button", name=nome, exact=True)], nivel)
        foto(pg, f"controles-{nivel}-cronograma")
        completo(pg, "grade")
    confere("icone-texto")
    abre_config(pg); pg.check('#dlg-config input[name="aparencia"][value="icone"]'); pg.keyboard.press("Escape")
    confere("icone")
    completo(pg, "grade"); foto(pg, "controles-icone-grade")
    ctx.close()

@caso("Todas acesas: só tira o esmaecimento; habilitada com uma inativa visível, inclusive a exceção de Só ativas; preferência preservada")
def t_todas_acesas(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "optativas"}, nome="todas-acesas")
    acesas = pg.get_by_role("button", name="Todas acesas", exact=True)
    ativas = pg.get_by_role("button", name="Só ativas", exact=True)
    expect(ativas).to_have_attribute("aria-pressed", "true")
    n = pg.locator(".opt.opt-inativa").count()
    assert (acesas.get_attribute("aria-disabled") == "true") == (n == 0), n
    ativas.click(); expect(ativas).to_have_attribute("aria-pressed", "false")
    inativas = pg.locator(".opt.opt-inativa"); assert inativas.count() > 0
    antes = pg.locator(".opt").count()
    expect(acesas).not_to_have_attribute("aria-disabled", "true"); acesas.focus(); pg.keyboard.press("Space")          # teclado
    expect(acesas).to_have_attribute("aria-pressed", "true"); assert ls(pg, "filtros")["acesas"] is True
    assert foco_em(pg, '[data-fcheck="acesas"]'), descreve_foco(pg)
    assert inativas.first.evaluate("e => getComputedStyle(e).opacity") == "1"
    assert pg.locator(".opt").count() == antes                                           # não filtra nada
    alvo = inativas.first.get_attribute("data-code")
    pg.keyboard.press("Enter"); expect(acesas).to_have_attribute("aria-pressed", "false")   # Enter também alterna
    assert float(inativas.first.evaluate("e => getComputedStyle(e).opacity")) < 1
    acesas.click(); ativas.click()
    if pg.locator(".opt.opt-inativa").count() == 0:
        # indisponível: aria-disabled, o motivo é anunciado ao acionar e a preferência fica
        expect(acesas).to_have_attribute("aria-disabled", "true"); expect(acesas).to_have_attribute("aria-pressed", "true")
        acesas.click(force=True); expect(pg.locator("#anuncio")).to_contain_text("Nenhuma optativa inativa na lista")
        assert ls(pg, "filtros")["acesas"] is True
    pg.reload(); pronto(pg, "todas-acesas"); assert ls(pg, "filtros")["acesas"] is True
    expect(pg.get_by_role("button", name="Todas acesas", exact=True)).to_have_attribute("aria-pressed", "true")
    ctx.close()
    # a exceção de Só ativas: uma inativa planejada continua na lista e habilita o controle
    perfil = json.loads(json.dumps(PERFIL)); perfil["periodos"][4]["disciplinas"].append(alvo)
    ctx, pg = abre(b, vp=C320, perfil=perfil, extra={"modoClassico": False, "vista": "optativas"}, nome="todas-acesas-excecao", esquema="dark")
    acesas = pg.get_by_role("button", name="Todas acesas", exact=True)
    expect(pg.get_by_role("button", name="Só ativas", exact=True)).to_have_attribute("aria-pressed", "true")
    expect(pg.locator(f'.opt.opt-inativa[data-code="{alvo}"]')).to_have_count(1)
    expect(acesas).not_to_have_attribute("aria-disabled", "true"); acesas.click()
    assert pg.locator(f'.opt[data-code="{alvo}"]').evaluate("e => getComputedStyle(e).opacity") == "1"
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    foto(pg, "todas-acesas-320-escuro")
    ctx.close()

@caso("Minimalista: cartão com nome e ícone de estado; ferramentas atrás do botão Ferramentas (Esc devolve o foco); números da barra por foco e toque; detalhamento volta ao sair")
def t_minimalista(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade", "aparencia": "minimalista", "progressoAberto": True,
                                            "exibir": {"codigo": True, "notas": True, "dificuldade": True}}, nome="minimalista")
    visiveis = lambda sel: pg.locator(sel).evaluate_all("es => es.filter((e) => e.getClientRects().length).length")
    assert visiveis("#painel .card .meta") == 0 and visiveis("#painel .card .nota") == 0
    expect(pg.locator('.card[data-code="MAC128"] .estado')).to_be_visible()                 # ícone de estado
    expect(pg.get_by_role("button", name=re.compile(r"^Cálculo II, Cursando · perfil"))).to_have_count(1)   # nome acessível com situação e origem
    # detalhamento e "detalhes" fora do Minimalista
    assert pg.locator("#bg-detalhes").count() == 0 and pg.locator("#progresso").is_hidden()
    # ⋯: o painel tem ícone e texto; Esc fecha e devolve o foco
    mais = pg.get_by_role("button", name="Ferramentas", exact=True)
    expect(mais).to_have_attribute("aria-expanded", "false"); assert pg.locator("[data-exibir]").first.is_hidden()
    mais.focus(); pg.keyboard.press("Enter")
    expect(mais).to_have_attribute("aria-expanded", "true"); expect(pg.locator("#ferr-painel")).to_be_visible()
    assert larg_rot(pg.locator('#ferr-painel [data-exibir="notas"]')) > 4                    # ícone e texto no painel
    pg.keyboard.press("Tab"); assert foco_em(pg, "#ferr-painel *"), descreve_foco(pg)
    pg.keyboard.press("Space")                                                                           # liga/desliga sem fechar o painel
    expect(pg.locator("#ferr-painel")).to_be_visible(); assert foco_em(pg, "#ferr-painel *"), descreve_foco(pg)
    foto(pg, "minimalista-painel")
    pg.keyboard.press("Escape")
    expect(pg.locator("#ferr-painel")).to_be_hidden(); assert foco_em(pg, "#ferr-mais"), descreve_foco(pg)
    mais.click(); expect(pg.locator("#ferr-painel")).to_be_visible()
    pg.locator(".rodape").click(); expect(pg.locator("#ferr-painel")).to_be_hidden()                     # clicar fora fecha
    # números da barra: escondidos, lidos pelo nome acessível e mostrados com foco
    barra = pg.locator("#barra-geral .bg-barra")
    assert re.search(r"Concluída \d+%.*de \d+ cr", barra.get_attribute("aria-label")), barra.get_attribute("aria-label")
    assert pg.locator(".bg-legenda").is_hidden()
    barra.focus(); expect(pg.locator(".bg-legenda")).to_be_visible()
    foto(pg, "minimalista-barra-foco")
    # ao sair do Minimalista, tudo volta
    abre_config(pg); pg.check('#dlg-config input[name="aparencia"][value="icone-texto"]'); pg.keyboard.press("Escape")
    expect(pg.locator("#bg-detalhes")).to_be_visible(); expect(pg.locator("#progresso")).to_be_visible()
    expect(pg.locator('.card[data-code="COS110"] .meta')).to_be_visible(); assert pg.locator("#ferr-mais").count() == 0
    expect(pg.locator("[data-exibir]").first).to_be_visible(); assert pg.locator("#barra-geral .bg-barra").get_attribute("tabindex") is None
    ctx.close()
    # toque, 320 px e tema escuro; Clássico também fica minimalista
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"aparencia": "minimalista"}, nome="minimalista-toque", toque=True, esquema="dark", modo="classico")
    assert pg.locator("#modo-classico").is_checked()
    assert visiveis("#painel .card .meta") == 0 and pg.locator("#barra-geral").is_hidden()        # Clássico: sem barra
    completo(pg, "grade")
    assert pg.locator(".bg-legenda").is_hidden()
    pg.locator("#barra-geral .bg-barra").tap(); expect(pg.locator(".bg-legenda")).to_be_visible()
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    foto(pg, "minimalista-320-escuro")
    pg.get_by_role("button", name="Ferramentas", exact=True).tap()
    expect(pg.locator("#ferr-painel")).to_be_visible()
    r = pg.locator("#ferr-painel").bounding_box(); assert r["x"] >= 0 and r["x"] + r["width"] <= 320 + 0.5, r
    foto(pg, "minimalista-320-painel")
    ctx.close()

@caso("Exibir → Plano: o cartão mostra o primeiro semestre planejado e +N; a lista completa no nome acessível e nos detalhes; Clássico e Configurações")
def t_plano_na_grade(b):
    perfil = json.loads(json.dumps(PERFIL)); perfil["periodos"][5]["disciplinas"].append("COS360")      # COS360 em 2027/1 e 2027/2
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade"}, nome="plano-grade")
    assert pg.locator(".plano-flag").count() == 0                                   # desligado por padrão
    pg.get_by_role("button", name="Plano", exact=True).click(); assert ls(pg, "exibir")["plano"] is True
    expect(pg.get_by_role("button", name="Plano", exact=True)).to_have_attribute("aria-pressed", "true")
    expect(pg.locator('.card[data-code="COS360"] .plano-flag')).to_have_text("2027/1 +1")
    expect(pg.locator('.card[data-code="COS360"] .plano-flag svg.ico')).to_have_count(1)
    expect(pg.locator('.card[data-code="EEL871"] .plano-flag')).to_have_text("2027/1")
    expect(pg.locator('.card[data-code="EEL873"] .plano-flag')).to_have_text("2027/2")
    assert pg.locator('.card[data-code="COS110"] .plano-flag').count() == 0          # sem plano, sem marca
    expect(pg.get_by_role("button", name=re.compile(r"^Otimização, .*planejada em 2027.1, 2027.2$"))).to_have_count(1)
    foto(pg, "plano-na-grade")
    pg.locator('.card[data-code="COS360"]').click()
    hist = pg.locator("#detalhes").inner_text()
    assert "2027/1" in hist and "2027/2" in hist and hist.count("Planejada") >= 2, hist      # a lista completa nos detalhes
    pg.keyboard.press("Escape")
    abre_config(pg); assert pg.locator('#dlg-config [data-exibir="plano"]').is_checked(); pg.keyboard.press("Escape")
    alterna_modo(pg); expect(pg.locator(".plano-flag")).to_have_count(0); assert ls(pg, "exibir")["plano"] is True    # Clássico: só cor e nome
    ctx.close()
    ctx, pg = abre(b, vp=C320, perfil=perfil, extra={"exibir": {"plano": True}, "vista": "grade"}, nome="plano-grade-320", toque=True, esquema="dark")
    c = pg.locator('.card[data-code="COS360"]'); c.scroll_into_view_if_needed()
    expect(c.locator(".plano-flag")).to_be_visible()
    r, f = c.bounding_box(), c.locator(".plano-flag").bounding_box()
    assert f["x"] >= r["x"] and f["x"] + f["width"] <= r["x"] + r["width"] + 0.5, (r, f)          # cabe no cartão
    foto(pg, "plano-na-grade-320-escuro")
    ctx.close()

# ------------------------------------------------------------------ Aprovações registradas por você (Registrar marcações)
HOJE = "2026-11-27T12:00:00"
DECL = {"periodos": [{"nome": "2025/2", "disciplinas": [{"code": "FIT112", "status": "reprovado"}, "COS111"]},
                     {"nome": "2026/2", "atual": True, "disciplinas": ["MAC128"]},
                     {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238"]}],
        "aprovacoesDeclaradas": [{"code": "MAC118", "registradoEm": "2026-11-27"},
                                 {"code": "COS110", "registradoEm": "2026-11-27", "semestre": "2025/1"},
                                 {"code": "FIT112", "registradoEm": "2026-11-27", "semestre": "2025/1"}]}

@caso("Declaradas no modelo: ícone ☑ com a origem no nome acessível; Linha do tempo com a coluna sem semestre; aviso de requisito; conflito; detalhamento; exportação")
def t_declaradas_modelo(b):
    ctx, pg = abre(b, perfil=DECL, extra={"modoClassico": False, "vista": "grade", "progressoAberto": True}, nome="declaradas-modelo", relogio=HOJE)
    expect(pg.locator('.card[data-code="MAC118"] .estado')).to_have_attribute("data-estado", "declarada")
    expect(pg.get_by_role("button", name=re.compile(r"^Cálculo I, Aprovada · registrada por você"))).to_have_count(1)
    expect(pg.locator('.card[data-code="COS110"] .estado')).to_have_attribute("data-estado", "declarada")
    assert pg.locator('.card[data-code="FIT112"] .estado').count() == 0 or pg.locator('.card[data-code="FIT112"] .estado').get_attribute("data-estado") != "declarada"   # conflito: não conta
    assert pg.evaluate("GradeInterativa.fonte('MAC118')") == "declarado" and pg.evaluate("GradeInterativa.fonte('FIT112')") is None
    assert "2 aprovações registradas por você: contam para fase e conquistas, não são registro do SIGA" in pg.locator("#progresso").inner_text()
    foto(pg, "declaradas-grade")
    # detalhes: registro, semestre não informado e o conflito com a reprovação
    pg.locator('.card[data-code="MAC118"]').click()
    det = pg.locator("#detalhes").inner_text()
    assert "Registrada por você em 2026-11-27 · semestre não informado" in det and "não é registro do SIGA" in det, det
    pg.keyboard.press("Escape"); pg.locator('.card[data-code="FIT112"]').click()
    assert "O SIGA traz reprovação em 2025/2, no semestre ou depois da aprovação que você registrou" in pg.locator("#detalhes").inner_text()
    pg.keyboard.press("Escape")
    # Linha do tempo: a coluna sem semestre vem primeiro; a declarada com semestre vai para a coluna dele, com etiqueta
    pg.click('[data-vista="timeline"]')
    cols = pg.locator("#painel .coluna h2").all_inner_texts()
    assert cols[0] == "Registradas por você" and "2025/1" in cols, cols
    primeira = pg.locator("#painel .coluna").first
    assert "sem semestre" in primeira.inner_text() and primeira.locator('.card[data-code="MAC118"]').count() == 1
    c2025 = pg.locator("#painel .coluna").filter(has=pg.locator("h2", has_text="2025/1"))
    assert "registrada por você" in c2025.locator('.card[data-code="COS110"]').inner_text()
    assert "Requisito MAC118 registrado por você sem semestre" in pg.locator('#painel .col-atual .card[data-code="MAC128"]').get_attribute("title")
    assert "MAC128" not in (pg.locator('#painel .col-planejado .card[data-code="MAC238"]').get_attribute("title") or "").split("—")[-1]
    pg.locator('#painel .coluna').first.locator('.card[data-code="MAC118"]').click()
    assert "Sem semestre" in pg.locator("#detalhes .det-ocorrencia").inner_text()
    pg.keyboard.press("Escape")
    foto(pg, "declaradas-linha-do-tempo")
    # o período virtual fica fora do Cronograma e da sugestão de "+ Período"; a exportação não o leva
    pg.click('[data-vista="cronograma"]')
    assert "Registradas" not in pg.locator(".crono-topo").inner_text()
    pg.get_by_role("button", name="Adicionar período").click()
    assert pg.locator("#periodo-nome").input_value() == "2027/2"
    pg.fill("#periodo-nome", "Registradas por você"); pg.click("#periodo-ok")
    expect(pg.locator("#periodo-msg")).to_contain_text("já existe"); pg.keyboard.press("Escape")
    exp = pg.evaluate("GradeInterativa.perfilExportado()")
    assert exp["aprovacoesDeclaradas"] == DECL["aprovacoesDeclaradas"] and [p["nome"] for p in exp["periodos"]] == ["2025/2", "2026/2", "2027/1"], exp
    ctx.close()
    # A4: ☑ distinto do ✓, nos dois temas e a 320 px
    for esquema in ("light", "dark"):
        ctx, pg = abre(b, vp=C320, perfil=DECL, extra={"vista": "grade"}, nome=f"declaradas-320-{esquema}", esquema=esquema, relogio=HOJE, toque=True)
        c = pg.locator('.card[data-code="MAC118"]'); c.scroll_into_view_if_needed(); expect(c.locator(".estado")).to_have_attribute("data-estado", "declarada")
        assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
        foto(pg, f"declaradas-icone-320-{esquema}")
        ctx.close()

@caso("Declaradas: prazo sem semestre (data não confirmada) e com semestre (idade, nota e origem); ACE sem semestre e com semestre (R10, R11, R16, R35)")
def t_declaradas_prazo_ace(b):
    perfil = {"periodos": [], "aprovacoesDeclaradas": [{"code": "COS110", "registradoEm": "2026-11-27"}, {"code": "MAC118", "registradoEm": "2026-11-27", "semestre": "2020/1"}],
              "equivalencias": [{"pedida": "COS351", "cursadas": ["COS110"], "status": "a pedir"}, {"pedida": "COS360", "cursadas": ["MAC118"], "status": "a pedir"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome="declaradas-prazo", relogio=HOJE)
    linhas = pg.locator("table tr").all_inner_texts()
    l110 = next(l for l in linhas if "COS351" in l); l118 = next(l for l in linhas if "COS360" in l)
    assert "Data de aprovação não confirmada: COS110 (aprovação registrada por você, sem semestre)" in l110 and "anos" not in l110, l110
    assert "6.5 anos: pode exigir exame de suficiência" in l118 and "Semestre informado por você, sem registro do SIGA" in l118, l118
    assert "Idade estimada pelo semestre de aprovação" in l118, l118
    foto(pg, "declaradas-prazo")
    ctx.close()
    for nome, decl, esperado in (("sem-semestre", {"code": "EEW002", "registradoEm": "2026-11-27"}, [30, 30, 0]),
                                 ("com-semestre", {"code": "EEW002", "registradoEm": "2026-11-27", "semestre": "2025/1"}, [60, 0, 0])):
        perfil = {"periodos": [], "aprovacoesDeclaradas": [decl], "extensao": [{"code": "EEW002", "horas": 30, "periodo": "2026/1", "status": "validada"}]}
        ctx, pg = abre(b, perfil=perfil, nome=f"declaradas-ace-{nome}", relogio=HOJE)
        assert horas_ace(pg) == esperado, (nome, horas_ace(pg))
        ctx.close()

@caso("Declaradas em arquivo e no navegador: perfil antigo aceito (pincel continua ✎); arquivo inválido recusado com o campo; item inválido do navegador ignorado com aviso (R20 a R22)")
def t_declaradas_arquivo(b):
    ctx, pg = abre(b, nome="declaradas-arquivo", relogio=HOJE)
    def carrega(obj, nome):
        pg.click("#btn-importar")
        pg.set_input_files("#importar", {"name": nome, "mimeType": "application/json", "buffer": json.dumps(obj).encode("utf-8")})
    antigo = json.loads(json.dumps(ANTIGO)); antigo["marcacoes"] = {"MAC128": "aprovada"}
    carrega(antigo, "antigo.json")
    expect(pg.locator("#titulo")).to_have_text(re.compile(r"Grade ECI — Fulano"))
    pg.click('[data-vista="grade"]'); expect(pg.locator('.card[data-code="MAC128"] .estado')).to_have_attribute("data-estado", "marcacao")
    assert "aprovacoesDeclaradas" not in pg.evaluate("GradeInterativa.perfilExportado()")
    alertas = []; pg.on("dialog", lambda d: (alertas.append(d.message), d.accept()))
    ruim = {"periodos": [], "aprovacoesDeclaradas": [{"code": "MAC118", "semestre": "2025"}]}
    carrega(ruim, "ruim.json")
    pg.wait_for_function("() => true"); pg.wait_for_timeout(300)
    assert alertas and "aprovacoesDeclaradas[0].semestre" in alertas[0], alertas
    expect(pg.locator("#titulo")).to_have_text(re.compile(r"Grade ECI — Fulano"))            # o perfil anterior fica
    ctx.close()
    plano = {"periodos": {}, "novos": [], "equivalencias": [{"pedida": "COS351", "cursadas": ["COS111"], "status": "a pedir"}],
             "aprovacoesDeclaradas": [{"semestre": "2025/1"}, {"code": "MAC118", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil={"periodos": []}, extra={"plano": plano}, nome="declaradas-plano-tolerante", relogio=HOJE)
    expect(pg.locator("#aviso-perfil")).to_contain_text("1 aprovação registrada por você foi ignorada por formato inválido")
    assert pg.evaluate("GradeInterativa.fonte('MAC118')") == "declarado"
    exp = pg.evaluate("GradeInterativa.perfilExportado()")
    assert exp["aprovacoesDeclaradas"] == [{"code": "MAC118", "registradoEm": "2026-11-27"}] and exp["equivalencias"] == plano["equivalencias"], exp
    ctx.close()

@caso("Declaradas e importação do SIGA: prévia com mantidas, confirmadas, divergência e não encontradas; o campo fica intacto e conta uma vez (R12, R13, R18)")
def t_declaradas_reimportar(b):
    perfil = {"periodos": [{"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238"]}],
              "aprovacoesDeclaradas": [{"code": "MAC118", "registradoEm": "2026-11-27"}, {"code": "FIT112", "registradoEm": "2026-11-27", "semestre": "2024/2"},
                                       {"code": "COS360", "registradoEm": "2026-11-27", "semestre": "2025/2"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade"}, nome="declaradas-reimportar", relogio=HOJE)
    gera(pg, ["historico-ficticio.pdf"])
    previa = pg.locator(".resumo-import").inner_text()
    assert "Aprovações registradas por você: 1 mantida, 2 confirmadas pelo SIGA, 1 com divergência (FIT112)." in previa, previa
    assert "não encontradas no Histórico importado: COS360" in previa, previa
    assert not pg.locator("#siga-usar").is_disabled()                                   # a prévia não bloqueia
    foto(pg, "declaradas-previa")
    pg.click("#siga-usar")
    p = ls(pg, "perfilImportado")
    assert p["aprovacoesDeclaradas"] == perfil["aprovacoesDeclaradas"], p.get("aprovacoesDeclaradas")       # intacta
    assert any(x["nome"] == "2027/1" and x.get("planejado") for x in p["periodos"])                       # plano mantido
    assert pg.evaluate("GradeInterativa.fonte('MAC118')") == "importado" and pg.evaluate("GradeInterativa.fonte('COS360')") == "declarado"
    completo(pg, "grade"); pg.locator('.card[data-code="MAC118"]').click()
    assert "Confirmada pelo SIGA em 2026/1" in pg.locator("#detalhes").inner_text()
    pg.keyboard.press("Escape"); pg.locator('.card[data-code="FIT112"]').click()
    assert "Você registrou 2024/2; o SIGA traz 2025/1. Vale o SIGA." in pg.locator("#detalhes").inner_text()
    pg.keyboard.press("Escape")
    totais = pg.evaluate("JSON.stringify(GradeInterativa.totais())")
    gera(pg, ["historico-ficticio.pdf"]); pg.click("#siga-usar")                        # reimportar de novo: mesmo resultado
    assert ls(pg, "perfilImportado")["aprovacoesDeclaradas"] == perfil["aprovacoesDeclaradas"]
    assert pg.evaluate("JSON.stringify(GradeInterativa.totais())") == totais
    ctx.close()

def abre_registro(pg, via_teclado=False):
    b = pg.locator("#btn-registrar")
    if via_teclado: b.focus(); pg.keyboard.press("Enter")
    else: b.click()
    expect(pg.locator("#dlg-registrar")).to_be_visible()

@caso("Registrar marcações sem perfil: contagem, criar perfil, gravar, resultado, Desfazer e Fechar; foco; recarregar (R01 a R03)")
def t_registrar_sem_perfil(b):
    marc = {"MAC118": "aprovada", "COS110": "aprovada", "EEL280": "aprovada", "MAC128": "cursando"}
    ctx, pg = abre(b, extra={"marcacoes": marc}, nome="registrar-sem-perfil", relogio=HOJE, atalhos=False)
    assert pg.locator("#btn-registrar").get_attribute("aria-disabled") is None
    abre_registro(pg, via_teclado=True)
    assert foco_em(pg, "#dlg-registrar-titulo"), descreve_foco(pg)
    expect(pg.locator("#reg-contagem")).to_have_text("Serão gravadas 3 aprovações.")
    expect(pg.get_by_role("button", name="Gravar 3 aprovações")).to_be_visible()
    texto = pg.locator("#dlg-registrar").inner_text()
    assert "Um perfil novo será criado neste navegador" in texto and "Não é registro do SIGA" in texto, texto
    assert pg.locator("#dlg-registrar [disabled]").count() == 0                      # A9: nada com disabled
    foto(pg, "registrar-sem-perfil")
    pg.fill("#reg-nome", "Ana Exemplo")
    pg.get_by_role("button", name="Gravar 3 aprovações").click()
    expect(pg.locator("#reg-resultado")).to_have_text("3 aprovações registradas por você.")
    assert foco_em(pg, "#reg-resultado"), descreve_foco(pg)
    p = ls(pg, "perfilImportado")
    assert p["nome"] == "Ana Exemplo" and p["aprovacoesDeclaradas"] == [{"code": c, "registradoEm": "2026-11-27"} for c in ("COS110", "EEL280", "MAC118")], p
    assert p["marcacoes"] == {"MAC128": "cursando"} and ls(pg, "marcacoes") == {"MAC128": "cursando"}
    expect(pg.locator('.card[data-code="MAC118"] .estado')).to_have_attribute("data-estado", "declarada")
    # o resultado não fecha com clique fora (o Desfazer continua disponível)
    pg.mouse.click(5, 5); expect(pg.locator("#dlg-registrar")).to_be_visible()
    foto(pg, "registrar-resultado")
    pg.get_by_role("button", name="Desfazer").click()                                 # R03: volta sem perfil, com as marcações
    expect(pg.locator("#reg-contagem")).to_have_text("Serão gravadas 3 aprovações.")
    assert ls(pg, "perfilImportado") is None and ls(pg, "marcacoes") == marc
    assert foco_em(pg, "#dlg-registrar *") or foco_em(pg, "#dlg-registrar-titulo"), descreve_foco(pg)
    expect(pg.locator('.card[data-code="MAC118"] .estado')).to_have_attribute("data-estado", "marcacao")
    pg.keyboard.press("Escape"); expect(pg.locator("#dlg-registrar")).to_be_hidden()   # cancelar não muda nada
    assert ls(pg, "marcacoes") == marc and ls(pg, "perfilImportado") is None
    assert foco_em(pg, "#btn-registrar"), descreve_foco(pg)
    # gravar pelo teclado e fechar pelo botão: o foco volta à paleta; recarregar mantém tudo
    abre_registro(pg); pg.locator("#reg-semestre").focus(); pg.keyboard.type("2025/2"); pg.keyboard.press("Enter")
    expect(pg.locator("#reg-resultado")).to_be_visible()
    pg.get_by_role("button", name="Fechar").click(); expect(pg.locator("#dlg-registrar")).to_be_hidden()
    assert foco_em(pg, "#btn-registrar"), descreve_foco(pg)
    assert pg.locator("#btn-registrar").get_attribute("aria-disabled") == "true"      # nada mais a registrar
    pg.reload(); pronto(pg, "registrar-sem-perfil")
    assert [d.get("semestre") for d in ls(pg, "perfilImportado")["aprovacoesDeclaradas"]] == ["2025/2"] * 3
    assert pg.evaluate("GradeInterativa.fonte('EEL280')") == "declarado"
    expect(pg.locator('.card[data-code="EEL280"] .estado')).to_have_attribute("data-estado", "declarada")
    ctx.close()

@caso("Registrar marcações com perfil: grupos, semestre inválido, conflito e em curso desmarcados, barra igual, Desfazer; 320 px e axe (R04 a R06, R30, R33)")
def t_registrar_com_perfil(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118", "FIS111"]}, {"nome": "2025/2", "disciplinas": [{"code": "FIT112", "status": "reprovado"}]},
                           {"nome": "2026/2", "atual": True, "disciplinas": ["COS231"]}],
              "aprovacoesDeclaradas": [{"code": "MAC238", "registradoEm": "2026-11-01"}]}
    marc = {"MAC118": "aprovada", "MAC128": "aprovada", "XYZ101": "aprovada", "FIT112": "aprovada", "COS231": "aprovada"}
    ctx, pg = abre(b, perfil=perfil, extra={"marcacoes": marc, "modoClassico": False, "vista": "grade", "progressoAberto": True}, nome="registrar-com-perfil", relogio=HOJE)
    barra = pg.locator("#barra-geral").inner_text(); totais = pg.evaluate("JSON.stringify(GradeInterativa.totais())")
    assert "Aprovação por marcação manual (pincel)" in pg.locator("#progresso").inner_text()
    abre_registro(pg)
    txt = pg.locator("#dlg-registrar").inner_text()
    assert "MAC118: já aprovada no perfil" in txt and "XYZ101: não reconhecida" in txt and "MAC238" not in txt, txt     # R04
    assert "Criar perfil" not in txt
    gravar = lambda: pg.locator('[data-reg-code]').evaluate_all("es => es.filter((e) => e.checked).map((e) => e.dataset.regCode)")
    assert gravar() == ["FIT112", "MAC128"], gravar()                                    # sem semestre: a reprovação de 2025/2 é anterior
    assert not pg.locator('[data-reg-code="COS231"]').is_checked()                       # A3: em curso no BOA, desmarcada
    assert "Em curso no BOA: registre só se já foi aprovada" in txt
    # R05: semestre inválido e futuro
    for v, msg in (("2027/1", "posterior ao atual"), ("2025/3", "AAAA/1 ou AAAA/2")):
        pg.fill("#reg-semestre", v); expect(pg.locator("#reg-semestre-msg")).to_contain_text(msg)
        expect(pg.locator("#reg-gravar")).to_have_attribute("aria-disabled", "true")
    pg.locator("#reg-gravar").click(force=True); expect(pg.locator("#reg-resultado")).to_have_count(0)    # aria-disabled não grava
    # R33: com 2025/1, FIT112 conflita com a reprovação de 2025/2: desmarcada, com motivo, sem poder marcar
    pg.fill("#reg-semestre", "2025/1"); expect(pg.locator("#reg-semestre-msg")).to_have_text("")
    cx = pg.locator('[data-reg-code="FIT112"]')
    expect(cx).to_have_attribute("aria-disabled", "true"); expect(cx).not_to_be_checked()
    expect(pg.locator("#reg-motivo-FIT112")).to_contain_text("reprovação em 2025/2")
    cx.click(force=True); expect(cx).not_to_be_checked()
    pg.fill("#reg-semestre", "2026/1"); expect(cx).not_to_have_attribute("aria-disabled", "true")
    cx.check(); expect(pg.locator("#reg-contagem")).to_have_text("Serão gravadas 2 aprovações.")
    pg.locator('[data-reg-code="COS231"]').check(); pg.locator('[data-reg-code="COS231"]').uncheck()
    pg.fill("#reg-semestre", "")
    vs = axe_graves(pg, contexto="#dlg-registrar"); assert not vs, vs                    # R30
    pg.get_by_role("button", name="Gravar 2 aprovações").click()
    expect(pg.locator("#reg-resultado")).to_have_text("2 aprovações registradas por você.")
    decl = ls(pg, "plano")["aprovacoesDeclaradas"]
    assert [d["code"] for d in decl] == ["MAC238", "FIT112", "MAC128"], decl           # as antigas ficam, as novas no fim
    assert set(ls(pg, "marcacoes")) == {"MAC118", "XYZ101", "COS231"}
    pg.get_by_role("button", name="Fechar").click()
    # R06: a barra não muda; o detalhamento troca a linha do pincel pela das registradas
    assert pg.locator("#barra-geral").inner_text() == barra and pg.evaluate("JSON.stringify(GradeInterativa.totais())") == totais
    prog = pg.locator("#progresso").inner_text()
    assert "3 aprovações registradas por você" in prog, prog
    ctx.close()
    ctx, pg = abre(b, vp=C320, perfil=perfil, extra={"marcacoes": marc, "vista": "grade"}, nome="registrar-320", relogio=HOJE, toque=True, esquema="dark")
    pg.locator("#btn-registrar").tap(); expect(pg.locator("#dlg-registrar")).to_be_visible()
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    r = pg.locator("#dlg-registrar").bounding_box(); assert r["x"] >= 0 and r["x"] + r["width"] <= 320.5, r
    for el in pg.locator('#dlg-registrar [data-reg-code], #dlg-registrar .dlg-acoes .btn').all():
        bb = el.bounding_box(); assert bb["width"] >= 24 and bb["height"] >= 24, bb
    foto(pg, "registrar-320-escuro")
    pg.get_by_role("button", name="Gravar 2 aprovações").tap()
    pg.get_by_role("button", name="Desfazer").tap()
    assert ls(pg, "marcacoes") == marc and (ls(pg, "plano") or {}).get("aprovacoesDeclaradas") in (None, [{"code": "MAC238", "registradoEm": "2026-11-01"}]), ls(pg, "plano")
    assert pg.evaluate("GradeInterativa.fonte('MAC128')") == "pincel"
    pg.keyboard.press("Escape")
    ctx.close()

@caso("Declarada no detalhe: editar o semestre (validado; em branco = desconhecido) e remover com confirmação; foco no título (R25)")
def t_declaradas_detalhe(b):
    perfil = {"periodos": [], "aprovacoesDeclaradas": [{"code": "MAC128", "registradoEm": "2026-11-20"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade"}, nome="declaradas-detalhe", relogio=HOJE)
    pg.locator('.card[data-code="MAC128"]').click(); expect(pg.locator("#detalhes")).to_be_visible()
    pg.fill("#decl-semestre", "2030/1"); pg.get_by_role("button", name="Salvar semestre").click()
    expect(pg.locator("#decl-semestre-msg")).to_contain_text("posterior ao atual")
    pg.fill("#decl-semestre", "2025/1"); pg.keyboard.press("Enter")
    expect(pg.locator("#detalhes .det-declarada")).to_contain_text("semestre 2025/1")
    assert ls(pg, "plano")["aprovacoesDeclaradas"] == [{"code": "MAC128", "registradoEm": "2026-11-20", "semestre": "2025/1"}]
    assert foco_em(pg, "#detalhes h3"), descreve_foco(pg)
    pg.fill("#decl-semestre", ""); pg.get_by_role("button", name="Salvar semestre").click()
    expect(pg.locator("#detalhes .det-declarada")).to_contain_text("semestre não informado")
    assert ls(pg, "plano")["aprovacoesDeclaradas"] == [{"code": "MAC128", "registradoEm": "2026-11-20"}]
    pg.get_by_role("button", name="Remover registro").click()
    expect(pg.locator("#dlg-confirma")).to_be_visible(); expect(pg.locator("#dlg-confirma-texto")).to_contain_text("A marcação do pincel não volta")
    pg.locator("#dlg-confirma-ok").click()
    expect(pg.locator("#detalhes .det-declarada")).to_have_count(0)
    assert foco_em(pg, "#detalhes h3"), descreve_foco(pg)
    expect(pg.locator("#anuncio")).to_contain_text("Registro de MAC128 removido")
    assert pg.evaluate("GradeInterativa.fonte('MAC128')") is None and "MAC128" not in (ls(pg, "marcacoes") or {})
    pg.keyboard.press("Escape")
    expect(pg.locator('.card[data-code="MAC128"] .estado')).to_have_count(0)            # pendente, sem ✎
    ctx.close()

@caso("Declaradas em Configurações e nos dados do navegador: remover em lote, limpar, descartar e carregar outro perfil avisam; exportar e recarregar preserva (R17, R23, R24, R26)")
def t_declaradas_gestao(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118"]}, {"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238"]}],
              "aprovacoesDeclaradas": [{"code": "MAC118", "registradoEm": "2026-11-27"}, {"code": "COS110", "registradoEm": "2026-11-27"}, {"code": "EEL280", "registradoEm": "2026-11-27", "semestre": "2025/2"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade"}, nome="declaradas-gestao", relogio=HOJE)
    totais = pg.evaluate("JSON.stringify(GradeInterativa.totais())"); barra = pg.locator("#barra-geral").inner_text()
    abre_config(pg)
    expect(pg.locator(".cfg-declaradas legend")).to_have_text("Aprovações registradas por você (3)")
    expect(pg.locator("#decl-remover-sel")).to_have_attribute("aria-disabled", "true")
    pg.get_by_role("button", name="Remover as já confirmadas pelo SIGA (1)").click()          # R26
    expect(pg.locator("#dlg-confirma-texto")).to_contain_text("MAC118"); pg.locator("#dlg-confirma-ok").click()
    expect(pg.locator(".cfg-declaradas legend")).to_have_text("Aprovações registradas por você (2)")
    assert [d["code"] for d in ls(pg, "plano")["aprovacoesDeclaradas"]] == ["COS110", "EEL280"]
    assert pg.evaluate("JSON.stringify(GradeInterativa.totais())") == totais              # a contagem não muda
    pg.locator('[data-decl-sel="COS110"]').check()
    expect(pg.get_by_role("button", name="Remover selecionadas (1)")).to_be_visible()
    pg.get_by_role("button", name="Remover selecionadas (1)").click(); pg.locator("#dlg-confirma button[value='']").click()   # cancelar
    assert len(ls(pg, "plano")["aprovacoesDeclaradas"]) == 2
    foto(pg, "declaradas-configuracoes")
    pg.keyboard.press("Escape")
    assert pg.locator("#barra-geral").inner_text() == barra
    # R17: exportar, limpar e carregar devolvem tudo igual
    completo(pg, "cronograma")
    with pg.expect_download() as dl: pg.locator("#exportar").click()
    txt = pathlib.Path(dl.value.path()).read_text(encoding="utf-8")
    antes = pg.evaluate("GradeInterativa.perfilExportado()")
    msgs = []
    def responde(d, aceita):
        msgs.append(d.message); (d.accept() if aceita else d.dismiss())
    pg.once("dialog", lambda d: responde(d, False))                                          # R23: cancelar não apaga
    abre_config(pg); pg.locator("#btn-limpar").click()
    assert "2 aprovações registradas por você" in msgs[-1], msgs
    assert len(ls(pg, "plano")["aprovacoesDeclaradas"]) == 2
    pg.once("dialog", lambda d: responde(d, True)); pg.locator("#btn-limpar").click()
    pg.wait_for_function("() => !localStorage.getItem('gradeECI.v2.perfilImportado')")
    assert ls(pg, "plano") is None and ls(pg, "perfilImportado") is None
    pg.keyboard.press("Escape"); pg.click("#btn-importar")
    pg.set_input_files("#importar", {"name": "perfil.js", "mimeType": "application/javascript", "buffer": txt.encode("utf-8")})
    pg.wait_for_function("() => GradeInterativa.perfilExportado().aprovacoesDeclaradas")
    depois = pg.evaluate("GradeInterativa.perfilExportado()")
    for k in ("aprovacoesDeclaradas", "periodos", "tags", "equivalencias", "extensao"):
        assert depois.get(k) == antes.get(k), (k, antes.get(k), depois.get(k))
    assert (depois.get("marcacoes") or {}) == (antes.get("marcacoes") or {})
    # R24: com uma declarada não exportada, carregar outro perfil pede confirmação; cancelar mantém
    pg.keyboard.press("Escape"); completo(pg, "grade"); pg.locator('.card[data-code="MAC128"]').click()
    pg.click('[data-settag="MAC128"][data-tag="aprovada"]'); pg.keyboard.press("Escape")
    abre_registro(pg); expect(pg.locator("#reg-contagem")).to_have_text("Será gravada 1 aprovação.")       # concordância com N = 1
    pg.get_by_role("button", name="Gravar 1 aprovação").click(); expect(pg.locator("#reg-resultado")).to_have_text("1 aprovação registrada por você.")
    pg.get_by_role("button", name="Fechar").click()
    pg.click("#btn-importar")
    pg.set_input_files("#importar", {"name": "outro.json", "mimeType": "application/json", "buffer": json.dumps({"periodos": [], "nome": "Outra"}).encode("utf-8")})
    expect(pg.locator("#dlg-confirma")).to_be_visible()
    expect(pg.locator("#dlg-confirma-texto")).to_contain_text("aprovações registradas por você")
    expect(pg.locator("#dlg-confirma-texto")).to_contain_text("não estão no arquivo")
    pg.locator("#dlg-confirma button[value='']").click()
    assert any(d["code"] == "MAC128" for d in ls(pg, "plano")["aprovacoesDeclaradas"])
    assert ls(pg, "perfilImportado").get("nome") != "Outra"
    # Descartar perfil salvo também avisa
    pg.once("dialog", lambda d: responde(d, False)); pg.keyboard.press("Escape"); pg.locator("#descartar-importado").click()
    assert "aprovações registradas por você também" in msgs[-1], msgs[-1]
    ctx.close()

@caso("Declarada com a disciplina em curso no BOA: o detalhe diz que o BOA mostra a disciplina em curso")
def t_declarada_cursando(b):
    perfil = {"periodos": [{"nome": "2026/2", "atual": True, "disciplinas": ["MAC128"]}], "aprovacoesDeclaradas": [{"code": "MAC128", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade"}, nome="declarada-cursando", relogio=HOJE)
    pg.locator('.card[data-code="MAC128"]').click()
    expect(pg.locator("#detalhes .det-declarada")).to_contain_text("O BOA mostra a disciplina em curso em 2026/2.")
    assert pg.evaluate("GradeInterativa.fonte('MAC128')") == "declarado"
    ctx.close()

def colunas(pg): return pg.locator("#painel .coluna h2").all_inner_texts()
@caso("Foco: só no Planejador e com perfil; aba escondida vai à Linha do tempo com anúncio; some o concluído; atual sempre; totais e plano intactos; desligar mantém a aba e o foco")
def t_foco(b):
    ctx, pg = abre(b, extra={"modoClassico": False}, nome="foco-sem-perfil", relogio=HOJE)
    f = pg.locator("#btn-foco")
    expect(f).to_have_attribute("aria-disabled", "true"); expect(pg.locator("#btn-foco-motivo")).to_have_text("Importe ou crie um perfil para usar o Foco.")
    f.click(force=True); expect(pg.locator("#anuncio")).to_contain_text("Importe ou crie um perfil"); assert ls(pg, "foco") is None
    ctx.close()
    ctx, pg = abre(b, perfil=PERFIL, nome="foco", relogio=HOJE, modo="classico")
    f = pg.locator("#btn-foco")
    expect(f).to_be_hidden()                                                             # Clássico: só o seletor e o tema no topo
    completo(pg, "optativas")
    expect(f).not_to_have_attribute("aria-disabled", "true"); expect(f).to_have_attribute("aria-pressed", "false")
    barra = pg.locator("#barra-geral").inner_text() if pg.locator("#barra-geral").is_visible() else None
    totais = pg.evaluate("JSON.stringify(GradeInterativa.totais())"); exportado = pg.evaluate("JSON.stringify(GradeInterativa.perfilExportado())")
    f.focus(); pg.keyboard.press("Enter")                                                # teclado
    expect(f).to_have_attribute("aria-pressed", "true"); assert ls(pg, "foco") is True
    expect(pg.locator('.abas [data-vista="timeline"]')).to_have_attribute("aria-selected", "true")
    expect(pg.locator("#anuncio")).to_contain_text("A aba Optativas fica escondida; você está na Linha do tempo")
    assert foco_em(pg, "#btn-foco"), descreve_foco(pg)
    for v in ("optativas", "pedidos", "eci"): expect(pg.locator(f'.abas [data-vista="{v}"]')).to_be_hidden()
    for v in ("grade", "timeline", "cronograma"): expect(pg.locator(f'.abas [data-vista="{v}"]')).to_be_visible()
    # Linha do tempo: os períodos passados todos concluídos somem (2025/1 só tinha a reprovação já superada); atual e planos ficam
    assert colunas(pg) == ["2026/2", "2027/1", "2027/2", "A alocar"], colunas(pg)
    assert pg.locator("#painel .card.s-aprovado").count() == 0
    expect(pg.locator('#painel .col-atual .card[data-code="MAC118"]')).to_have_count(1)     # prevista fica
    expect(pg.locator("#aba-conquistas")).to_be_visible(); assert pg.locator("#painel .cartao-fase").count() == 0   # a fase e a estante ficam na aba
    foto(pg, "foco-linha-do-tempo")
    abre_conquistas(pg); expect(pg.locator("#painel .cartao-fase")).to_be_visible(); expect(pg.locator("#painel .estante")).to_be_visible()
    pg.locator('.abas [data-vista="timeline"]').click()
    # Grade: some o concluído, a prevista fica; os totais e o plano não mudam
    pg.locator('.abas [data-vista="grade"]').click()
    assert pg.locator('#painel .card[data-code="COS110"]').count() == 0 and pg.locator('#painel .card[data-code="MAC118"]').count() == 1
    assert pg.evaluate("JSON.stringify(GradeInterativa.totais())") == totais and pg.evaluate("JSON.stringify(GradeInterativa.perfilExportado())") == exportado
    if barra: assert pg.locator("#barra-geral").inner_text() == barra
    pg.locator('.abas [data-vista="timeline"]').focus(); pg.keyboard.press("ArrowRight")     # setas pulam as abas escondidas
    expect(pg.locator('.abas [data-vista="cronograma"]')).to_have_attribute("aria-selected", "true")
    pg.locator('.abas [data-vista="grade"]').click()
    # desligar: fica na aba atual e o foco continua no 🎯
    f.click(); expect(f).to_have_attribute("aria-pressed", "false")
    expect(pg.locator('.abas [data-vista="grade"]')).to_have_attribute("aria-selected", "true"); assert foco_em(pg, "#btn-foco")
    expect(pg.locator('#painel .card[data-code="COS110"]')).to_have_count(1); expect(pg.locator(".abas [data-vista=optativas]")).to_be_visible()
    # Clássico guarda a preferência; ao voltar ao Planejador, o Foco volta
    f.click(); alterna_modo(pg)
    expect(f).to_be_hidden(); expect(f).to_have_attribute("aria-pressed", "false")
    assert ls(pg, "foco") is True and pg.locator("#aba-conquistas").is_hidden()
    alterna_modo(pg); expect(f).to_have_attribute("aria-pressed", "true")
    pg.reload(); pronto(pg, "foco"); expect(pg.locator("#btn-foco")).to_have_attribute("aria-pressed", "true")
    # sem perfil: desabilitado com orientação; o planejamento fica intacto
    pg.once("dialog", lambda d: d.accept()); pg.locator("#descartar-importado").click()
    expect(pg.locator("#btn-foco")).to_have_attribute("aria-disabled", "true"); assert pg.locator("#aba-conquistas").is_hidden()
    ctx.close()
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"modoClassico": False, "vista": "timeline", "foco": True}, nome="foco-320", relogio=HOJE, toque=True, esquema="dark")
    expect(pg.locator("#btn-foco")).to_have_attribute("aria-pressed", "true")
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    bb = pg.locator("#btn-foco").bounding_box(); assert bb["width"] >= 44 and bb["height"] >= 44, bb
    foto(pg, "foco-320-escuro", full=True)
    ctx.close()

def motivacao(pg): return pg.evaluate("GradeInterativa.motivacao()")
def abre_conquistas(pg):
    """Aba Conquistas: o cartão da fase (.cartao-fase) e a estante (.estante) ficam dentro de #painel."""
    pg.click('[data-vista="conquistas"]'); expect(pg.locator("#painel .conquistas")).to_be_visible()
def obrigatorias(pg): return pg.evaluate("window.courses[1].filter((c) => c.code && (c.category || 1) === 1).map((c) => [c.code, c.credits, c.semester])")
@caso("Motivação: fase calouro, meio (P5) e veterano; marca declarado (R27); reingresso; sem Histórico; cartões por fase; tom zoeira e discreto; previsão de formatura (C4)")
def t_motivacao(b):
    base = {"modoClassico": False, "vista": "conquistas", "foco": True}
    # calouro: um semestre e menos de 25%
    cal = {"periodos": [{"nome": "2025/2", "disciplinas": ["COS110", "COS111"]}, {"nome": "2026/2", "atual": True, "disciplinas": ["MAC118"]}]}
    ctx, pg = abre(b, perfil=cal, extra=base, nome="motivacao-calouro", relogio=HOJE)
    m = motivacao(pg); assert (m["fase"]["fase"], m["fase"]["declarado"], m["semestres"]) == ("calouro", False, 1), m["fase"]
    card = pg.locator("#painel .cartao-fase")
    expect(card.locator("h3").first).to_have_text("🌱 Calouro")
    for t in ("Base que destrava tudo", "Primeiro marco", "Faltam", "Primeiros passos", "Planejar o próximo período"): expect(card).to_contain_text(t)
    abre_config(pg); pg.check('#dlg-config input[name="tom"][value="discreto"]'); pg.keyboard.press("Escape")
    assert ls(pg, "tom") == "discreto"; expect(card).to_contain_text("Base do curso"); expect(card).not_to_contain_text("Base que destrava tudo")
    foto(pg, "motivacao-calouro-discreto")
    ctx.close()
    # P5: menos de 25% com três semestres do Histórico = meio do curso
    p5 = {"periodos": [{"nome": n, "disciplinas": [c]} for n, c in (("2024/1", "COS110"), ("2024/2", "COS111"), ("2025/1", "EEL280"))]}
    ctx, pg = abre(b, perfil=p5, extra=base, nome="motivacao-p5", relogio=HOJE)
    m = motivacao(pg); assert m["fase"]["fase"] == "meio" and m["pctComDeclaradas"] < 0.25 and m["semestres"] == 3, m
    expect(pg.locator("#painel .cartao-fase #fase-titulo")).to_have_text("🏋️ Meio do curso")
    expect(pg.locator("#painel .cartao-fase")).to_contain_text("Metade do caminho")
    obr = obrigatorias(pg)
    ctx.close()
    # R27 (b): ~40 cr importados e ~20 declarados, um semestre: "Meio do curso · declarado"; (a) 60 + 50: sem marca
    def escolhe(alvo, pular=()):
        out, soma = [], 0
        for code, cr, _ in obr:
            if code in pular or soma >= alvo: continue
            out.append(code); soma += cr
        return out, soma
    imp, si = escolhe(40); dec, sd = escolhe(20, set(imp))
    assert si < 56.5 <= si + sd, (si, sd)
    r27 = {"periodos": [{"nome": "2025/2", "disciplinas": imp}], "aprovacoesDeclaradas": [{"code": c, "registradoEm": "2026-11-27"} for c in dec]}
    ctx, pg = abre(b, perfil=r27, extra=base, nome="motivacao-r27", relogio=HOJE)
    m = motivacao(pg); assert (m["fase"]["fase"], m["fase"]["declarado"]) == ("meio", True), m["fase"]
    expect(pg.locator("#painel .cartao-fase #fase-titulo")).to_contain_text("Meio do curso · declarado")
    ctx.close()
    imp, si = escolhe(60); dec, sd = escolhe(50, set(imp))
    r27a = {"periodos": [{"nome": "2025/2", "disciplinas": imp}], "aprovacoesDeclaradas": [{"code": c, "registradoEm": "2026-11-27"} for c in dec]}
    ctx, pg = abre(b, perfil=r27a, extra=base, nome="motivacao-r27a", relogio=HOJE)
    m = motivacao(pg); assert (m["fase"]["fase"], m["fase"]["declarado"]) == ("meio", False), m["fase"]
    ctx.close()
    # reingresso: muitas transferidas no bloco e um semestre no curso atual: não é calouro
    trans, st = escolhe(70)
    rei = {"periodos": [{"nome": "2025 (transferidas)", "disciplinas": trans}, {"nome": "2025/2", "disciplinas": [c for c, _, _ in obr if c not in trans][:1]}]}
    ctx, pg = abre(b, perfil=rei, extra=base, nome="motivacao-reingresso", relogio=HOJE)
    m = motivacao(pg); assert m["fase"]["fase"] == "meio" and m["semestres"] == 1, (m["fase"], m["semestres"])
    ctx.close()
    # sem Histórico: só declaradas, pelo percentual
    sh = {"periodos": [], "aprovacoesDeclaradas": [{"code": "COS110", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=sh, extra=base, nome="motivacao-sem-historico", relogio=HOJE)
    m = motivacao(pg); assert (m["fase"]["fase"], m["semestres"]) == ("calouro", 0)
    assert m["previsao"]["estado"] == "indisponivel" and "Sem período atual" in m["previsao"]["texto"]
    expect(pg.locator("#painel .previsao")).to_contain_text("Sem período atual")
    ctx.close()
    # veterano com o plano cobrindo tudo: previsão; sem o plano de ACE: a pendência concreta só de horas
    feitas = [c for c, _, _ in obr if c not in ("EEWX00", "EEWU00")]
    vet = {"periodos": [{"nome": "2025/1", "disciplinas": feitas + [{"code": "XYZ201", "name": "Optativa fictícia", "credits": 30, "category": 2}]},
                        {"nome": "2026/2", "atual": True, "disciplinas": ["EEWX00", {"code": "XYZ202", "name": "Optativa fictícia II", "credits": 10, "category": 2}]},
                        {"nome": "2027/1", "planejado": True, "disciplinas": ["EEWU00", {"code": "XYZ301", "name": "Livre fictícia", "credits": 8, "category": 3},
                                                                         {"code": "XYZ401", "name": "Humanas fictícia", "credits": 4, "category": 4}]}],
           "extensao": [{"nome": "Projeto de extensão fictício", "horas": 405, "periodo": "2027/1", "status": "planejada"}]}
    ctx, pg = abre(b, perfil=vet, extra=base, nome="motivacao-veterano", relogio=HOJE)
    m = motivacao(pg); assert m["fase"]["fase"] == "veterano", m["fase"]
    assert (m["previsao"]["estado"], m["previsao"].get("semestre")) == ("previsao", "2027/1"), m["previsao"]
    card = pg.locator("#painel .cartao-fase")
    for t in ("🎓 Veterano", "Reta final", "Checklist da formatura", "Projeto de Graduação", "Extensão/ACE: 0 de 405 h", "No seu plano, você forma em 2027/1 (estimativa)"):
        expect(card).to_contain_text(t)
    foto(pg, "motivacao-veterano")
    ctx.close()
    vet2 = json.loads(json.dumps(vet)); vet2["extensao"] = []
    ctx, pg = abre(b, perfil=vet2, extra=base, nome="motivacao-veterano-sem-ace", relogio=HOJE)
    m = motivacao(pg); assert m["previsao"]["estado"] == "pendente" and "405 h de Extensão / ACE" in m["previsao"]["texto"], m["previsao"]
    assert next(s for s in m["selos"] if s["id"] == "notion")["estado"] == "obtido"      # o selo do Notion não depende de ACE
    vet3 = json.loads(json.dumps(vet2)); vet3["periodos"][2]["disciplinas"] = vet3["periodos"][2]["disciplinas"][1:]     # tira o Estágio do plano
    ctx.close()
    ctx, pg = abre(b, perfil=vet3, extra=base, nome="motivacao-veterano-sem-estagio", relogio=HOJE)
    m = motivacao(pg)
    assert next(s for s in m["selos"] if s["id"] == "notion")["estado"] == "falta" and "Estágio" in m["previsao"]["texto"], m["previsao"]
    ctx.close()

@caso("Conquistas na aba do Foco: declarado, quase lá, próximo marco; aviso com a aba fechada e .novo ao abrir; uma vez por perfil (recarga e atualização mantêm; substituição recomeça); movimento reduzido")
def t_conquistas_estante(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118", "MAC128", "MAC238"]}, {"nome": "2026/2", "atual": True, "disciplinas": ["COS231"]}],
              "aprovacoesDeclaradas": [{"code": "MAC248", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome="conquistas", relogio=HOJE)
    est = pg.locator("#painel .estante")
    expect(pg.locator("#anuncio")).to_contain_text("Rei dos Cálculos")                       # aviso da conquista nova, com a aba fechada
    abre_conquistas(pg)
    rei = est.locator(".selo", has_text="Rei dos Cálculos")
    expect(rei).to_have_class(re.compile(r"(^| )novo( |$)"))                                  # aparece como novo ao abrir a aba
    expect(rei).to_contain_text("· declarado"); expect(rei).to_have_class(re.compile(r"s-obtido"))
    expect(est.locator(".estante-resumo")).to_contain_text("próxima:")
    assert ls(pg, "selosAvisados")["vistos"] and ls(pg, "perfilId") and "MAC" not in ls(pg, "perfilId")
    foto(pg, "conquistas-estante", full=True)
    pg.evaluate("document.querySelector('#anuncio').textContent = ''")
    pg.reload(); pronto(pg, "conquistas"); pg.wait_for_timeout(200)
    assert "Rei dos Cálculos" not in pg.locator("#anuncio").inner_text()                     # recarga: não repete
    vistos, ident = ls(pg, "selosAvisados"), ls(pg, "perfilId")
    pg.click("#btn-perfil"); pg.fill("#perfil-nome", "Ana"); pg.click("#perfil-salvar")      # atualização do mesmo perfil
    expect(pg.locator("#titulo")).to_contain_text("Ana")
    assert ls(pg, "perfilId") == ident and ls(pg, "selosAvisados") == vistos
    # substituição: outro arquivo recomeça a lista
    pg.click("#btn-importar")
    pg.set_input_files("#importar", {"name": "outro.json", "mimeType": "application/json", "buffer": json.dumps({"periodos": [{"nome": "2025/1", "disciplinas": ["COS110"]}]}).encode("utf-8")})
    expect(pg.locator("#dlg-confirma-texto")).to_contain_text("MAC248"); pg.locator("#dlg-confirma-ok").click()   # a declarada sairia: confirma
    pg.wait_for_function("(id) => JSON.parse(localStorage.getItem('gradeECI.v2.perfilId') || 'null') !== id", arg=ident)
    completo(pg, "grade"); pg.keyboard.press("Escape")
    expect(pg.locator("#anuncio")).to_contain_text("Hello, world")
    ctx.close()
    # R29 na tela: só o pincel na última disciplina = quase lá (simulação ✎), sem selo; movimento reduzido
    p2 = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118", "MAC128", "MAC238"]}, {"nome": "2026/2", "atual": True, "disciplinas": []}]}
    ctx, pg = abre(b, perfil=p2, extra={"modoClassico": False, "vista": "grade", "foco": True, "marcacoes": {"MAC248": "aprovada"}}, nome="conquistas-pincel", relogio=HOJE, esquema="dark")
    pg.emulate_media(reduced_motion="reduce")
    abre_conquistas(pg)
    rei = pg.locator("#painel .selo", has_text="Rei dos Cálculos")
    expect(rei).to_contain_text("quase lá (simulação ✎)"); expect(rei).to_have_class(re.compile(r"s-quase"))
    novo = pg.locator("#painel .selo.novo").first
    if novo.count(): assert novo.evaluate("e => getComputedStyle(e).animationName") == "none"
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    vs = axe_graves(pg, contexto="#painel"); assert not vs, vs
    foto(pg, "conquistas-pincel-escuro", full=True)
    ctx.close()

@caso("Configurações: remover em lote que esvazia a lista de declaradas deixa o foco no título, nunca no body")
def t_declaradas_lote_foco(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118"]}], "aprovacoesDeclaradas": [{"code": "MAC118", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=perfil, nome="declaradas-lote-foco", relogio=HOJE)
    abre_config(pg)
    pg.get_by_role("button", name="Remover as já confirmadas pelo SIGA (1)").click(); pg.locator("#dlg-confirma-ok").click()
    expect(pg.locator(".cfg-declaradas")).to_have_count(0)
    assert foco_em(pg, "#dlg-config-titulo"), descreve_foco(pg)
    pg.keyboard.press("Tab"); assert foco_em(pg, "#dlg-config *"), descreve_foco(pg)     # o Tab continua dentro de Configurações
    ctx.close()

@caso("Foco: o aviso de conquistas não cobre os botões do topo; a estante não repete a regra no que falta; frases da fase; a paleta não encobre o cartão a 320 px")
def t_foco_ajustes(b):
    for vp, nome in ((D, "1440"), (C320, "320")):
        ctx, pg = abre(b, vp=vp, perfil=PERFIL, extra={"modoClassico": False, "vista": "grade"}, nome=f"foco-ajustes-{nome}", relogio=HOJE, toque=vp is C320)
        pg.locator("#btn-foco").click()
        expect(pg.locator("#anuncio")).to_have_class(re.compile(r"visivel")); expect(pg.locator("#anuncio")).to_contain_text("novas conquistas")
        cobertos = pg.evaluate("""() => { const a = document.querySelector('#anuncio').getBoundingClientRect();
            return [...document.querySelectorAll('.topo button, .topo label, .topo [role=tab]')].filter((e) => e.getClientRects().length).filter((e) => {
              const r = e.getBoundingClientRect(); return r.left < a.right && a.left < r.right && r.top < a.bottom && a.top < r.bottom; }).map((e) => e.id || e.textContent.trim()); }""")
        assert not cobertos, (nome, cobertos)
        foto(pg, f"foco-aviso-{nome}")
        if vp is C320:
            # na aba Conquistas não há paleta por cima; a Situação fica acima das conquistas, sem rolagem lateral
            abre_conquistas(pg); expect(pg.locator("#paleta")).to_be_hidden()
            assert pg.locator("#painel .cq-situacao").bounding_box()["y"] < pg.locator("#painel .estante").bounding_box()["y"]
            assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
        ctx.close()
    # estante: no selo não obtido, sem repetir a regra no "falta"
    ctx, pg = abre(b, perfil={"periodos": [{"nome": "2025/1", "disciplinas": ["FIT112"]}]}, extra={"modoClassico": False, "vista": "conquistas", "foco": True}, nome="foco-estante-falta", relogio=HOJE)
    einstein = pg.locator("#painel .selo", has_text="Valeu, Einstein").locator("small").inner_text()
    assert "· falta" in einstein and einstein.split("· falta")[1].count(",") == 2, einstein
    rede = pg.locator("#painel .selo", has_text="Ping 0 ms").locator("small").inner_text()
    assert "falta" not in rede, rede                                                         # nada aprovado: só a regra
    ctx.close()
    # frases: Devagar e sempre (meio de curso) e Calma, Calabreso (período planejado com duas difíceis); discreto é sóbrio
    perfil = {"periodos": [{"nome": n, "disciplinas": [c]} for n, c in (("2024/1", "COS110"), ("2024/2", "COS111"), ("2025/1", "EEL280"))]
              + [{"nome": "2027/1", "planejado": True, "disciplinas": ["MAC238", "COS360"]}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "conquistas", "foco": True}, nome="foco-frases", relogio=HOJE)
    card = pg.locator("#painel .cartao-fase")
    expect(card).to_contain_text("🐢 Devagar e sempre. Faltam")
    expect(card).to_contain_text("🧘 Calma, Calabreso. Período 2027/1 com 2 matérias difíceis: dá para planejar.")
    abre_config(pg); pg.check('#dlg-config input[name="tom"][value="discreto"]'); pg.keyboard.press("Escape")
    expect(card).not_to_contain_text("Devagar e sempre"); expect(card).to_contain_text("O período 2027/1 tem 2 matérias difíceis. Vale planejar com folga.")
    ctx.close()

@caso("ACE com origens diferentes: 405 h validadas e 30 h registradas por você no mesmo código, em outro semestre, não deixam Extensão em dia nem Acabou! como declarado")
def t_ace_origem(b):
    ctx, pg = abre(b, perfil={"periodos": []}, nome="ace-origem-obr", relogio=HOJE); obr = [c for c, _, _ in obrigatorias(pg)]; ctx.close()
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": obr + [{"code": "XYZ201", "name": "Optativa fictícia", "credits": 40, "category": 2},
                {"code": "XYZ301", "name": "Livre fictícia", "credits": 8, "category": 3}, {"code": "XYZ401", "name": "Humanas fictícia", "credits": 4, "category": 4}]},
                           {"nome": "2026/2", "atual": True, "disciplinas": []}],
              "extensao": [{"code": "ACE901", "nome": "Atividade validada fictícia", "periodo": "2026/2", "horas": 405, "status": "validada"}],
              "aprovacoesDeclaradas": [{"code": "ACE901", "name": "Atividade declarada fictícia", "semestre": "2025/1", "registradoEm": "2026-11-27", "horas": 30, "category": 5}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome="ace-origem", relogio=HOJE)
    s = {x["id"]: (x["estado"], x.get("declarado")) for x in motivacao(pg)["selos"]}
    assert s["extensao"] == ("obtido", False) and s["acabou"] == ("obtido", False), s
    ctx.close()

@caso("Previsão e selo do Notion só com o registrado e o plano: créditos manuais não cumprem; primeiro semestre coberto, sem repetir disciplina, com o semestre das horas de ACE")
def t_previsao_cobertura(b):
    ctx, pg = abre(b, perfil={"periodos": []}, nome="previsao-cobertura-obr", relogio=HOJE); obr = [c for c, _, _ in obrigatorias(pg)]; ctx.close()
    it = lambda code, cr, cat: {"code": code, "name": "Disciplina fictícia " + code, "credits": cr, "category": cat}
    base = {"periodos": [{"nome": "2025/1", "disciplinas": obr}, {"nome": "2026/2", "atual": True, "disciplinas": []},
                         {"nome": "2027/1", "planejado": True, "disciplinas": [it("XYZ201", 40, 2), it("XYZ301", 8, 3), it("XYZ401", 4, 4)]}],
            "extensao": [{"nome": "Projeto fictício", "horas": 405, "periodo": "2027/1", "status": "planejada"}]}
    def resumo(perfil, extra=None, nome=""):
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True, **(extra or {})}, nome=f"previsao-cobertura-{nome}", relogio=HOJE)
        m = motivacao(pg); r = (m["previsao"]["estado"], m["previsao"].get("semestre"), next(s for s in m["selos"] if s["id"] == "notion")["estado"], m["previsao"]["texto"])
        barra = pg.locator("#barra-geral .bg-total").inner_text(); ctx.close(); return r, barra
    r, _ = resumo(base, nome="base"); assert r[:3] == ("previsao", "2027/1", "obtido"), r
    x = json.loads(json.dumps(base)); x["periodos"].append({"nome": "2030/2", "planejado": True, "disciplinas": [it("XYZ201", 40, 2)]})
    r, _ = resumo(x, nome="repetida"); assert r[:2] == ("previsao", "2027/1"), r                     # repetir mais tarde não muda
    x = json.loads(json.dumps(base)); x["extensao"][0]["periodo"] = "2029/2"
    r, _ = resumo(x, nome="ace-tarde"); assert r[:3] == ("previsao", "2029/2", "obtido"), r          # as horas terminam em 2029/2
    x = json.loads(json.dumps(base)); x["extensao"][0].pop("periodo")
    r, _ = resumo(x, nome="ace-sem-data"); assert r[0] == "indisponivel" and "sem semestre" in r[3], r
    x = json.loads(json.dumps(base)); x["periodos"].pop(); x["extensao"][0]["status"] = "validada"
    r, barra = resumo(x, {"creditos": {"2": 40, "3": 8, "4": 4}}, nome="manuais")                    # B1: créditos manuais simulam
    assert r[0] == "pendente" and r[2] == "falta" and "Planeje os 52 cr que faltam" in r[3], r
    assert barra.startswith("226 de 226 cr"), barra                                                  # a barra continua com a simulação
    ctx, pg = abre(b, perfil=x, extra={"modoClassico": False, "vista": "conquistas", "foco": True, "creditos": {"2": 40, "3": 8, "4": 4}}, nome="previsao-cobertura-tela", relogio=HOJE)
    expect(pg.locator("#painel .previsao")).to_contain_text("Planeje os 52 cr que faltam"); expect(pg.locator("#painel .previsao")).not_to_contain_text("Você já cumpriu")
    ctx.close()

@caso("Trocar e descartar perfil com declaradas: avisa pelas que sairiam (mesmo sem edições); arquivo inválido não apaga os avisos; descartar tira as do plano")
def t_perfil_troca_declaradas(b):
    perfil = {"nome": "Beatriz Fictícia", "periodos": [{"nome": "2026/2", "atual": True, "disciplinas": []}],
              "aprovacoesDeclaradas": [{"code": "COS110", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome="troca-declaradas", relogio=HOJE)
    pg.wait_for_function("localStorage.getItem('gradeECI.v2.selosAvisados') !== null")
    avisos, ident = ls(pg, "selosAvisados"), ls(pg, "perfilId")
    def carrega(obj, nome):
        pg.click("#btn-importar"); pg.set_input_files("#importar", {"name": nome, "mimeType": "application/json", "buffer": json.dumps(obj).encode("utf-8")})
    # arquivo inválido: recusado sem mexer nos avisos nem na identidade
    msgs = []; pg.on("dialog", lambda d: (msgs.append(d.message), d.accept()))
    carrega({"periodos": 5}, "invalido.json"); pg.wait_for_timeout(300)
    assert msgs and "periodos" in msgs[-1], msgs
    assert ls(pg, "selosAvisados") == avisos and ls(pg, "perfilId") == ident
    pg.keyboard.press("Escape")
    # o mesmo registro no arquivo: nada sai, sem pergunta
    carrega({"nome": "Mesmo", "periodos": [], "aprovacoesDeclaradas": perfil["aprovacoesDeclaradas"]}, "mesmo.json")
    expect(pg.locator("#titulo")).to_contain_text("Mesmo"); assert pg.locator("#dlg-confirma").is_hidden()
    # sem edições, outro arquivo sem a declarada: pergunta antes; cancelar mantém
    pg.keyboard.press("Escape"); carrega({"nome": "Outro", "periodos": []}, "outro.json")
    expect(pg.locator("#dlg-confirma")).to_be_visible(); expect(pg.locator("#dlg-confirma-texto")).to_contain_text("COS110")
    pg.locator("#dlg-confirma button[value='']").click()
    assert pg.evaluate("GradeInterativa.fonte('COS110')") == "declarado" and ls(pg, "perfilImportado")["nome"] == "Mesmo"
    ctx.close()
    # descartar: a declarada do plano sai junto e não fica ativa
    ctx, pg = abre(b, perfil={"nome": "Perfil fictício", "periodos": []}, extra={"modoClassico": False, "vista": "grade",
        "plano": {"periodos": {}, "novos": [], "aprovacoesDeclaradas": [{"code": "COS110", "registradoEm": "2026-11-27"}]}}, nome="descartar-declaradas", relogio=HOJE)
    msgs = []; pg.on("dialog", lambda d: (msgs.append(d.message), d.accept()))
    pg.locator("#descartar-importado").click(); pg.wait_for_function("localStorage.getItem('gradeECI.v2.perfilImportado') === null")
    assert "e 1 aprovação registrada por você também" in msgs[-1], msgs
    assert "aprovacoesDeclaradas" not in (ls(pg, "plano") or {}) and pg.evaluate("GradeInterativa.declaradas().ativas") == []
    ctx.close()

@caso("Previsão com equivalência prevista: a pedida entra no plano no semestre efetivo, como a prevista direta, também com uma origem registrada por você, nas duas ordens")
def t_previsao_equivalencia_prevista(b):
    ctx, pg = abre(b, perfil={"periodos": []}, nome="previsao-eq-obr", relogio=HOJE); obr = [c for c, _, _ in obrigatorias(pg)]; ctx.close()
    pedida, outra = obr[:2]
    feitas = obr[2:] + [{"code": "XYZ201", "credits": 40, "category": 2}, {"code": "XYZ301", "credits": 8, "category": 3}, {"code": "XYZ401", "credits": 4, "category": 4}]
    def resumo(atual, equivalencias, nome, declaradas=None):
        perfil = {"periodos": [{"nome": "2025/1", "disciplinas": feitas}, {"nome": "2026/2", "atual": True, "disciplinas": atual}],
                  "equivalencias": equivalencias, "extensao": [{"nome": "Projeto fictício", "horas": 405, "periodo": "2025/1", "status": "validada"}],
                  **({"aprovacoesDeclaradas": declaradas} if declaradas else {})}
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome=f"previsao-eq-{nome}", relogio=HOJE)
        m = motivacao(pg); r = (m["previsao"]["estado"], m["previsao"].get("semestre"), next(s for s in m["selos"] if s["id"] == "notion")["estado"],
                                 pg.evaluate("(c) => GradeInterativa.fonte(c)", pedida))
        ctx.close(); return r
    direta = resumo([{"code": pedida, "status": "previsto"}, outra], [], "direta")
    assert direta[:3] == ("previsao", "2026/2", "obtido"), direta
    por_eq = resumo([{"code": "XYZ202", "credits": 4, "category": 3, "status": "previsto"}, outra],
                    [{"status": "deferido", "pedida": pedida, "cursadas": ["XYZ202"]}], "equivalencia")
    assert por_eq == ("previsao", "2026/2", "obtido", "previsto"), por_eq          # prevista, não cumprida; o plano cobre
    # uma origem registrada por você e outra prevista no atual: o mesmo resultado nas duas ordens
    for sem_decl in ("2026/2", "2026/1"):                                        # no mesmo semestre da prevista (empate) e antes
        decl = [{"code": "XYZ203", "name": "Origem fictícia", "credits": 2, "category": 3, "semestre": sem_decl, "registradoEm": "2026-11-27"}]
        for ordem in (["XYZ203", "XYZ202"], ["XYZ202", "XYZ203"]):
            r = resumo([{"code": "XYZ202", "credits": 4, "category": 3, "status": "previsto"}, outra],
                       [{"status": "deferido", "pedida": pedida, "cursadas": ordem}], f"declarada-{sem_decl.replace('/', '-')}-{ordem[0]}", decl)
            assert r == ("previsao", "2026/2", "obtido", "previsto"), (sem_decl, ordem, r)

@caso("Equivalência na tela: prevista em período passado, origem ausente ou reprovada e pedido a pedir não cobrem o plano nem dão selo; prazo pela regra do bloco; período exibido igual nas duas ordens")
def t_equivalencia_vizinhos(b):
    ctx, pg = abre(b, perfil={"periodos": []}, nome="eq-vizinhos-obr", relogio=HOJE); obr = [c for c, _, _ in obrigatorias(pg)]; ctx.close()
    pedida, outra = obr[:2]
    def previsao(tipo):
        origem = {"code": "XYZ202", "credits": 4, "category": 3, "status": "previsto"}
        hist = obr[2:] + [{"code": "XYZ201", "credits": 40, "category": 2}, {"code": "XYZ301", "credits": 8, "category": 3}, {"code": "XYZ401", "credits": 4, "category": 4}]
        if tipo == "passado": hist.append(origem)
        if tipo == "reprovada": hist.append({**origem, "status": "reprovado"})
        atual = [outra] + ([origem] if tipo in ("a pedir", "deferido") else [])
        perfil = {"periodos": [{"nome": "2025/1", "disciplinas": hist}, {"nome": "2026/2", "atual": True, "disciplinas": atual}],
                  "equivalencias": [{"status": "a pedir" if tipo == "a pedir" else "deferido", "pedida": pedida, "cursadas": ["XYZ202"]}],
                  "extensao": [{"nome": "Projeto fictício", "horas": 405, "periodo": "2025/1", "status": "validada"}]}
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome=f"eq-vizinhos-{tipo.replace(' ', '-')}", relogio=HOJE)
        m = motivacao(pg)
        r = (pg.evaluate("(c) => GradeInterativa.fonte(c)", pedida), m["previsao"]["estado"], next(x for x in m["selos"] if x["id"] == "notion")["estado"])
        ctx.close(); return r
    assert previsao("deferido") == ("previsto", "previsao", "obtido")
    assert previsao("passado") == ("previsto", "pendente", "falta"), previsao("passado")       # prevista num período passado não cobre
    for tipo in ("reprovada", "ausente", "a pedir"):
        r = previsao(tipo); assert r == (None, "pendente", "falta"), (tipo, r)                      # sem fonte, sem plano, sem selo
    # prazo (D-03): a pedida que vem de uma transferida usa o ano do bloco, não a aprovação original de 2019/2
    def pedidos(perfil, nome):
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome=nome, relogio=HOJE)
        t = pg.locator("tr.eq-a-pedir").inner_text(); ctx.close(); return t
    t = pedidos({"periodos": [{"nome": "2024 (transferidas)", "disciplinas": [{"code": "XYZ201", "aprovadaEm": "2019/2", "name": "Transferida fictícia"}]},
                              {"nome": "2026/2", "atual": True, "disciplinas": []}],
                 "equivalencias": [{"status": "deferido", "pedida": obr[0], "cursadas": ["XYZ201"]}, {"status": "a pedir", "pedida": obr[1], "cursadas": [obr[0]]}]}, "eq-vizinhos-prazo")
    assert "só o ano 2024" in t and "anos: pode exigir" not in t and "mais de 5 anos" not in t, t
    # empate: o período exibido não depende da ordem das origens (vence o período real)
    rows = [pedidos({"periodos": [{"nome": "2025 (transferidas)", "disciplinas": [{"code": "XYZ201", "aprovadaEm": "2024/2", "name": "Transferida fictícia"}]},
                                  {"nome": "2024/2", "disciplinas": [{"code": "XYZ202", "name": "Importada fictícia"}]}],
                     "equivalencias": [{"status": "deferido", "pedida": obr[0], "cursadas": ordem}, {"status": "a pedir", "pedida": obr[1], "cursadas": [obr[0]]}]},
                    f"eq-vizinhos-empate-{n}") for n, ordem in enumerate((["XYZ201", "XYZ202"], ["XYZ202", "XYZ201"]))]
    assert rows[0] == rows[1] and "2024/2" in rows[0], rows

@caso("Equivalência encadeada e plano no passado na tela: a cadeia dá o mesmo resultado nas duas ordens; plano num período que já passou não cobre e é avisado; o prazo misto diz de onde vem a data; com dois blocos, o prazo usa o mais recente nas duas ordens")
def t_equivalencia_encadeada(b):
    ctx, pg = abre(b, perfil={"periodos": []}, nome="eq-cadeia-obr", relogio=HOJE); obr = [c for c, _, _ in obrigatorias(pg)]; ctx.close()
    pedida, outra = obr[:2]
    feitas = obr[2:] + [{"code": "XYZ201", "credits": 40, "category": 2}, {"code": "XYZ301", "credits": 8, "category": 3}, {"code": "XYZ401", "credits": 4, "category": 4}]
    def resumo(periodos, equivalencias, nome):
        perfil = {"periodos": [{"nome": "2025/1", "disciplinas": feitas}] + periodos, "equivalencias": equivalencias,
                  "extensao": [{"nome": "Projeto fictício", "horas": 405, "periodo": "2025/1", "status": "validada"}]}
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "grade", "foco": True}, nome=nome, relogio=HOJE)
        m = motivacao(pg); r = (m["previsao"]["estado"], m["previsao"].get("semestre"), next(s for s in m["selos"] if s["id"] == "notion")["estado"],
                                 pg.evaluate("(c) => GradeInterativa.fonte(c)", pedida), m["previsao"]["texto"])
        ctx.close(); return r
    atual = [{"nome": "2026/2", "atual": True, "disciplinas": [{"code": "XYZ202", "credits": 4, "category": 3, "status": "previsto"}, outra]}]
    cadeia = [{"status": "deferido", "pedida": "XYZ203", "cursadas": ["XYZ202"]}, {"status": "deferido", "pedida": pedida, "cursadas": ["XYZ203"]}]
    r1, r2 = resumo(atual, cadeia, "eq-cadeia-1"), resumo(atual, cadeia[::-1], "eq-cadeia-2")
    assert r1 == r2 and r1[:4] == ("previsao", "2026/2", "obtido", "previsto"), (r1, r2)
    # plano num período que já passou: não cobre, não dá selo e o texto explica
    r = resumo([{"nome": "2024/2", "planejado": True, "disciplinas": [pedida]}, {"nome": "2026/2", "atual": True, "disciplinas": [outra]}], [], "eq-plano-passado")
    assert r[0] == "pendente" and r[2] == "falta" and "2024/2" in r[4] and "já passou" in r[4], r
    # prazo misto: a data vem do registro do SIGA (2024/2), não da origem informada por você (2019/2)
    perfil = {"periodos": [{"nome": "2024/2", "disciplinas": [{"code": "XYZ202", "name": "Importada fictícia"}]}, {"nome": "2026/2", "atual": True, "disciplinas": []}],
              "aprovacoesDeclaradas": [{"code": "XYZ201", "name": "Origem fictícia", "credits": 2, "category": 3, "semestre": "2019/2", "registradoEm": "2026-11-27"}],
              "equivalencias": [{"status": "deferido", "pedida": obr[0], "cursadas": ["XYZ201", "XYZ202"]}, {"status": "a pedir", "pedida": obr[1], "cursadas": [obr[0]]}]}
    ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome="eq-prazo-misto", relogio=HOJE)
    t = pg.locator("tr.eq-a-pedir").inner_text(); ctx.close()
    assert "Base do prazo: o registro do SIGA" in t and "SIGA.Base" not in t and "sem registro do SIGA" not in t, t
    # dois blocos de transferidos com a mesma disciplina: o prazo usa o bloco mais recente (2025), nas duas ordens
    blocos = [{"nome": "2019 (transferidas)", "disciplinas": [{"code": "XYZ201", "aprovadaEm": "2018/2", "name": "Transferida fictícia"}]},
              {"nome": "2025 (transferidas)", "disciplinas": [{"code": "XYZ201", "aprovadaEm": "2018/2", "name": "Transferida fictícia"}]}]
    for n, ordem in enumerate((blocos, blocos[::-1])):
        perfil = {"periodos": ordem + [{"nome": "2026/2", "atual": True, "disciplinas": []}],
                  "equivalencias": [{"status": "a pedir", "pedida": obr[0], "cursadas": ["XYZ201"]}]}
        ctx, pg = abre(b, perfil=perfil, extra={"modoClassico": False, "vista": "pedidos"}, nome=f"eq-dois-blocos-{n}", relogio=HOJE)
        t = pg.locator("tr.eq-a-pedir").inner_text(); ctx.close()
        assert "só o ano 2025" in t and "2019" not in t.replace("2018/2", ""), (n, t)

CASOS5 = [t_controles_icones, t_todas_acesas, t_minimalista, t_plano_na_grade, t_declaradas_modelo, t_declaradas_prazo_ace, t_declaradas_arquivo, t_declaradas_reimportar,
          t_registrar_sem_perfil, t_registrar_com_perfil, t_declaradas_detalhe, t_declaradas_gestao, t_declarada_cursando, t_foco, t_motivacao, t_conquistas_estante, t_declaradas_lote_foco, t_foco_ajustes, t_ace_origem, t_previsao_cobertura, t_perfil_troca_declaradas, t_previsao_equivalencia_prevista, t_equivalencia_vizinhos, t_equivalencia_encadeada]
CASOS += CASOS5


# ------------------------------------------------------------------ v2.1.0
CASOS6 = []
def v210(f): CASOS6.append(f); return f

@v210
@caso("Dificuldade numa fileira só: os botões do filtro por nível são a legenda (bolinha e nome em Ícone + texto; só a bolinha em Só ícones, nome no title e no leitor de tela); filtro e aria-pressed como antes; sem legenda separada")
def t_legenda_dificuldade(b):
    base = {"vista": "grade", "exibir": {"codigo": True, "dificuldade": True}}
    ctx, pg = abre(b, perfil=PERFIL, extra=base, nome="dificuldade-texto")
    grupo = pg.get_by_role("group", name="Dificuldade"); expect(grupo).to_be_visible()
    assert pg.locator(".escala-dificuldade, .leg-niv").count() == 0                                   # a legenda separada saiu
    bts = pg.locator("#ferramentas .filtro-nivel [data-nivel]")
    assert bts.count() == 5 and pg.locator("#ferramentas [data-nivel]").count() == 5                     # uma fileira só
    textos = [" ".join(t.split()) for t in bts.all_inner_texts()]
    assert textos == ["🟢 Trivial", "🔵 Só o básico", "🟡 Matéria de verdade", "🟠 Difícil", "🔴 Morte instantânea"], textos
    for k, nome in enumerate(ESCALA):
        bt = grupo.get_by_role("button", name=nome, exact=True); expect(bt).to_have_count(1)
        assert bt.get_attribute("title") == nome and bt.get_attribute("aria-pressed") == "false", nome
    # o filtro continua: Enter e Espaço alternam, aria-pressed acompanha, o foco fica e a preferência é salva
    dificil = grupo.get_by_role("button", name="Difícil", exact=True); dificil.focus(); pg.keyboard.press("Enter")
    expect(dificil).to_have_attribute("aria-pressed", "true"); assert ls(pg, "filtroNivel") == [4]
    assert foco_em(pg, '[data-nivel="4"]'), descreve_foco(pg)
    assert pg.locator("#painel .card.apagado").count() > 0                                               # as outras disciplinas esmaecem
    pg.reload(); pronto(pg, "dificuldade-texto"); expect(pg.locator('#ferramentas [data-nivel="4"]')).to_have_attribute("aria-pressed", "true")
    pg.locator('#ferramentas [data-nivel="4"]').focus(); pg.keyboard.press("Space")
    expect(pg.locator('#ferramentas [data-nivel="4"]')).to_have_attribute("aria-pressed", "false"); assert ls(pg, "filtroNivel") == []
    ctx.close()
    # 390 px com toque: cada botão numa linha só (a bolinha nunca se separa do nome)
    ctx, pg = abre(b, vp=C, perfil=PERFIL, extra=base, nome="dificuldade-390", toque=True)
    alturas = pg.locator("#ferramentas .filtro-nivel [data-nivel]").evaluate_all("es => es.map((e) => e.getBoundingClientRect().height)")
    assert max(alturas) - min(alturas) < 2, alturas
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    ctx.close()
    # Só ícones: só a bolinha; nome no title e no nome acessível; tocar filtra como antes
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={**base, "aparencia": "icone"}, nome="dificuldade-icones", toque=True, esquema="dark")
    grupo = pg.get_by_role("group", name="Dificuldade")
    visivel = r"e => { const c = e.cloneNode(true); c.querySelectorAll('.rot').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ''); }"
    for nome in ESCALA:
        bt = grupo.get_by_role("button", name=nome, exact=True); expect(bt).to_have_count(1)
        assert bt.get_attribute("title") == nome and larg_rot(bt) <= 1, nome
    assert pg.locator("#ferramentas .filtro-nivel").evaluate(visivel) == "Dificuldade🟢🔵🟡🟠🔴"
    grupo.get_by_role("button", name="Trivial", exact=True).tap(); assert ls(pg, "filtroNivel") == [1]
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    foto(pg, "dificuldade-icones-320-escuro")
    ctx.close()

@v210
@caso("Botões que acendem: Exibir e filtros das Optativas sem caixa de marcar; Tab, Enter e Espaço; aria-pressed segue o salvo; Só ícones com nome; foco visível; axe nos dois temas; 320 px")
def t_botoes_acesos(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="botoes-acesos")
    caixas = "#ferramentas input[type=checkbox], #ferramentas input[type=radio]:not([name=trilha]), .filtros input[type=checkbox]"
    assert pg.locator(caixas).count() == 0
    notas = pg.locator('#ferramentas [data-exibir="notas"]')
    assert notas.evaluate("e => e.tagName") == "BUTTON" and not aceso(notas)
    pg.locator('#ferramentas [data-exibir="codigo"]').focus(); pg.keyboard.press("Tab")        # Tab vai ao próximo botão
    assert foco_em(pg, '[data-exibir="notas"]'), descreve_foco(pg)
    assert pg.evaluate("document.activeElement.matches(':focus-visible')") and notas.evaluate("e => getComputedStyle(e).outlineStyle") != "none"
    pg.keyboard.press("Enter"); expect(notas).to_have_attribute("aria-pressed", "true"); assert ls(pg, "exibir")["notas"] is True
    assert foco_em(pg, '[data-exibir="notas"]'), descreve_foco(pg)                              # o foco fica no botão redesenhado
    pg.keyboard.press("Space"); expect(notas).to_have_attribute("aria-pressed", "false"); assert ls(pg, "exibir")["notas"] is False
    pg.keyboard.press("Space"); pg.reload(); pronto(pg, "botoes-acesos")
    expect(pg.locator('#ferramentas [data-exibir="notas"]')).to_have_attribute("aria-pressed", "true")
    for esq in ("light", "dark"):
        pg.emulate_media(color_scheme=esq)
        graves = axe_graves(pg, contexto="#ferramentas"); assert not graves, (esq, graves[:3])
    # filtros das Optativas: um botão por opção, persistido
    pg.click('[data-vista="optativas"]')
    for g in pg.locator(".filtros [data-fgrupo]").all():                                         # espaço entre o ícone e o texto
        r = g.evaluate("e => [e.querySelector('svg').getBoundingClientRect().right, e.querySelector('.rot').getBoundingClientRect().left]")
        assert r[1] - r[0] >= 4, r
    assert pg.locator(caixas).count() == 0 and pg.locator(".filtros [data-falvo]").count() <= 1        # Horários continua select nativo
    lib = pg.get_by_role("button", name="Só liberadas", exact=True); expect(lib).to_have_attribute("aria-pressed", "false")
    lib.focus(); pg.keyboard.press("Enter"); expect(lib).to_have_attribute("aria-pressed", "true")
    pg.reload(); pronto(pg, "botoes-acesos")
    expect(pg.get_by_role("button", name="Só liberadas", exact=True)).to_have_attribute("aria-pressed", "true"); assert ls(pg, "filtros")["liberadas"] is True
    for esq in ("light", "dark"):
        pg.emulate_media(color_scheme=esq)
        graves = axe_graves(pg, contexto=".filtros"); assert not graves, (esq, graves[:3])
    ctx.close()
    # Só ícones: só o ícone; o nome fica no title e no nome acessível; 320 px sem rolagem lateral
    ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"vista": "grade", "aparencia": "icone"}, nome="botoes-acesos-icones", toque=True, esquema="dark")
    for k, nome in (("codigo", "Código e créditos"), ("situacao", "Situação")):
        bt = pg.get_by_role("button", name=nome, exact=True); expect(bt).to_have_count(1)
        assert bt.get_attribute("title") == nome and larg_rot(bt) <= 1 and bt.locator("svg.ico").count() == 1, k
        r = bt.bounding_box(); assert r["width"] >= 24 and r["height"] >= 24, (k, r)
    for nome in ("Desligado", "Ao segurar", "Ao passar o mouse"):                                  # Trilha em Só ícones
        r = pg.get_by_role("radio", name=nome, exact=True); expect(r).to_have_count(1)
        assert r.evaluate("e => e.closest('label').querySelector('.rot').getBoundingClientRect().width") <= 1
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    foto(pg, "botoes-acesos-icones-320-escuro")
    pg.click('[data-vista="optativas"]')
    expect(pg.get_by_role("button", name="Só ativas", exact=True)).to_have_attribute("title", "Só ativas")
    assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
    foto(pg, "filtros-icones-320-escuro")
    ctx.close()

@v210
@caso("Situação: liga e desliga o ícone de estado nos cartões da Grade; padrão ligado; fica salva; a situação continua no nome acessível e nos detalhes; Linha do tempo não muda")
def t_situacao(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade", "marcacoes": {"MAC238": "aprovada"}}, nome="situacao")
    sit = pg.get_by_role("button", name="Situação", exact=True); expect(sit).to_have_attribute("aria-pressed", "true")
    assert "situacao" not in (ls(pg, "exibir") or {})                                       # padrão: ligado, sem gravar nada
    expect(pg.locator('#painel .card[data-code="COS110"] .estado[data-estado="aprovado"]')).to_have_count(1)
    expect(pg.locator('#painel .card[data-code="MAC238"] .estado[data-estado="marcacao"]')).to_have_count(1)
    sit.click(); expect(sit).to_have_attribute("aria-pressed", "false"); assert ls(pg, "exibir")["situacao"] is False
    expect(pg.locator("#painel .card .estado")).to_have_count(0)                              # cartões e blocos da Grade
    expect(pg.locator('#painel .card[data-code="MAC128"]')).to_have_accessible_name(re.compile(r"Cursando · perfil"))
    pg.locator('#painel .card[data-code="MAC128"]').click(); expect(pg.locator("#detalhes .det-status")).to_contain_text("Cursando")
    pg.keyboard.press("Escape")
    pg.reload(); pronto(pg, "situacao")
    expect(pg.get_by_role("button", name="Situação", exact=True)).to_have_attribute("aria-pressed", "false")
    expect(pg.locator("#painel .card .estado")).to_have_count(0)
    abre_config(pg); assert not pg.locator('#dlg-config [data-exibir="situacao"]').is_checked()   # Configurações acompanha
    pg.check('#dlg-config [data-exibir="situacao"]'); pg.keyboard.press("Escape")
    expect(pg.get_by_role("button", name="Situação", exact=True)).to_have_attribute("aria-pressed", "true")
    expect(pg.locator('#painel .card[data-code="COS110"] .estado')).to_have_count(1)
    pg.get_by_role("button", name="Situação", exact=True).click()
    pg.click('[data-vista="timeline"]')                                                      # vale só para a Grade
    assert pg.locator("#painel .card .estado").count() > 0
    ctx.close()

# Caracteres de símbolo (Unicode So/Sm, fora do ASCII) em controles. Exceções declaradas (conteúdo, não controle): as
# bolinhas da dificuldade, os emojis dos selos e os chips do cartão de fase.
VARREDURA = r"""(excecoes) => {
    const ruins = [];
    document.querySelectorAll('button, [role=tab], .ctl').forEach((el) => {
        if (!el.getClientRects().length || el.closest('.cartao-fase, .estante, .selo, #dlg-eci')) return;
        const c = el.cloneNode(true); c.querySelectorAll('.sr, svg').forEach((x) => x.remove());
        const txt = [...c.textContent.replace(/[\x00-\x7F]/g, '')].filter((ch) => /[\p{So}\p{Sm}]/u.test(ch) && !excecoes.includes(ch) && ch !== '️' && ch !== '‍');
        if (txt.length) ruins.push((el.id || el.className || el.tagName) + ': ' + txt.join(''));
    });
    return ruins; }"""
EXCECOES_SIMBOLOS = ["🟢", "🔵", "🟡", "🟠", "🔴"]

@v210
@caso("Ícones Lucide: nenhum emoji ou símbolo solto em botões, abas e controles (Grade, Linha do tempo, Optativas, Cronograma, Pedidos, detalhes, tags, Configurações e Minimalista)")
def t_varredura_simbolos(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade", "progressoAberto": True, "marcacoes": {"MAC238": "aprovada"},
                                            "exibir": {"codigo": True, "notas": True, "dificuldade": True, "presenca": True, "plano": True}}, nome="varredura")
    achados = {}
    def confere(onde):
        r = pg.evaluate(VARREDURA, EXCECOES_SIMBOLOS)
        if r: achados[onde] = r[:6]
    confere("grade")
    pg.locator('#painel .card[data-code="COS360"]').click(); confere("detalhes"); pg.keyboard.press("Escape")
    pg.click("#editar-tags"); confere("tags"); pg.keyboard.press("Escape")
    for vista in ("timeline", "optativas", "cronograma", "pedidos"):
        pg.click(f'[data-vista="{vista}"]'); confere(vista)
    pg.click('[data-vista="cronograma"]'); pg.click('[data-cperiodo="2027/1"]'); confere("cronograma-periodo")
    abre_config(pg); confere("configuracoes"); pg.keyboard.press("Escape")
    abre_config(pg); pg.check('#dlg-config input[name="aparencia"][value="minimalista"]'); pg.keyboard.press("Escape")
    pg.click('[data-vista="grade"]'); pg.click("#ferr-mais"); confere("minimalista")
    expect(pg.locator("#btn-foco svg.ico")).to_have_count(1)                                  # Foco com o ícone target
    ctx.close()
    assert not achados, achados

TOPO_PLANEJADOR = "#btn-config, #btn-foco, #btn-importar, #btn-perfil, #btn-privacidade, #btn-referencias, #btn-tags"

@v210
@caso("Clássico só para pintar: topo só com seletor e tema; sem barra, Detalhes, Registrar, aviso, legenda e extras no cartão; pintar, limpar e cadeado; tema salvo; Exibir intacto; 320 px nos dois temas")
def t_classico_so_pintar(b):
    exibir = {"codigo": True, "notas": True, "dificuldade": True, "presenca": True, "plano": True, "situacao": True, "destaque": "foco"}
    extra = {"exibir": exibir, "progressoAberto": True, "marcacoes": {"MAC238": "aprovada"}, "ocultarSeletor": True}
    ctx, pg = abre(b, perfil=PERFIL, extra=extra, nome="classico-pintar", modo="classico")
    # topo: só o seletor (mesmo com ocultarSeletor) e o tema (mesmo desafixado, aqui fixado com os outros atalhos)
    expect(pg.locator("#seletor-modo")).to_be_visible(); expect(pg.locator("#btn-tema")).to_be_visible()
    assert pg.locator("#atalhos button").count() == 1
    for sel in TOPO_PLANEJADOR.split(", "): expect(pg.locator(sel)).to_be_hidden()      # ocultos ou fora do DOM
    arvore = pg.locator(".topo").aria_snapshot()
    assert "Configurações" not in arvore and "Foco" not in arvore and "Importar" not in arvore, arvore
    # nada de barra, detalhamento, legenda, ferramentas nem aviso do perfil salvo
    for sel in ("#barra-geral", "#progresso", "#legenda", "#ferramentas", "#aviso-importado", "#aba-conquistas"):
        expect(pg.locator(sel)).to_be_hidden()
    # cartões só com cor e nome; blocos sem a barra de preenchimento; sem contagem do período
    for sel in (".meta", ".nota", ".plano-flag", ".estado", ".sub"):
        assert pg.locator(f"#painel .card {sel}").count() == 0, sel
    assert pg.locator("#painel .col-topo .chip").count() == 0 and pg.locator("#painel .card.bloco[style]").count() == 0
    expect(pg.locator('#painel .card[data-code="MAC128"]')).to_have_accessible_name(re.compile(r"Cursando · perfil"))   # leitor de tela
    # paleta: tags, borracha, editar tags e cadeado; sem Registrar, Detalhes e ECI por trás
    assert pg.locator("#btn-registrar, #paleta [data-pincel='__detalhes'], #pal-eci").count() == 0
    for sel in ("#editar-tags", "#cadeado", '#paleta [data-pincel=""]', '#paleta [data-pincel="aprovada"]'): expect(pg.locator(sel)).to_be_visible()
    expect(pg.locator('#paleta [data-pincel=""]')).to_have_accessible_name("Limpar")                          # no Clássico, "Limpar"
    assert "Limpar" in pg.locator('#paleta [data-pincel=""]').get_attribute("title") and pg.locator("#paleta").get_by_text("Borracha").count() == 0
    # Tab: nenhum controle oculto recebe foco
    vistos = set()
    for _ in range(12):
        pg.keyboard.press("Tab"); vistos.add(pg.evaluate("document.activeElement.id || document.activeElement.className"))
    assert not ({"btn-config", "btn-foco", "btn-importar", "btn-perfil"} & vistos), vistos
    # pintar e limpar
    pg.locator('#painel .card[data-code="MAC248"]').click(); assert ls(pg, "marcacoes").get("MAC248") == "aprovada"   # pendente no perfil
    pg.click('#paleta [data-pincel=""]'); pg.locator('#painel .card[data-code="MAC248"]').click(); assert ls(pg, "marcacoes").get("MAC248") == ""
    expect(pg.locator("#detalhes")).to_be_hidden()
    # cadeado: a protegida só anuncia, sem abrir Detalhes
    pg.click("#cadeado"); pg.click('#paleta [data-pincel="cursando"]'); pg.locator('#painel .card[data-code="COS110"]').click()
    expect(pg.locator("#anuncio")).to_contain_text("protegida pelo cadeado"); expect(pg.locator("#detalhes")).to_be_hidden()
    assert "COS110" not in ls(pg, "marcacoes")
    # Editar tags continua (faz parte da paleta)
    pg.click("#editar-tags"); expect(pg.locator("#detalhes")).to_contain_text("Tags de cor"); pg.keyboard.press("Escape")
    # tema alterna e fica salvo
    pg.click("#btn-tema"); expect(pg.locator("html")).to_have_attribute("data-tema", "escuro"); assert ls(pg, "tema") == "escuro"
    # o Clássico não muda as preferências do Planejador
    assert ls(pg, "exibir") == exibir and ls(pg, "ocultarSeletor") is True and ls(pg, "progressoAberto") is True
    pg.reload(); pronto(pg, "classico-pintar")
    expect(pg.locator("html")).to_have_attribute("data-tema", "escuro"); expect(pg.locator("#seletor-modo")).to_be_visible()
    # alternar o modo com os atalhos fixados: a barra acompanha nos dois sentidos
    alterna_modo(pg)
    expect(pg.locator("#btn-config")).to_be_visible(); expect(pg.locator("#btn-importar")).to_be_visible(); expect(pg.locator("#seletor-modo")).to_be_hidden()
    pg.locator("#modo-classico").evaluate("e => e.click()")                                   # seletor oculto no Planejador: troca direta
    expect(pg.locator("#btn-config")).to_be_hidden(); assert pg.locator("#atalhos button").count() == 1
    alterna_modo(pg); expect(pg.locator("#btn-tags")).to_be_visible()
    ctx.close()
    # 320 px, nos dois temas: sem rolagem lateral
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C320, perfil=PERFIL, extra={"exibir": exibir}, nome=f"classico-320-{esq}", toque=True, esquema=esq, modo="classico")
        assert pg.locator("#painel .card .meta, #painel .card .estado").count() == 0
        assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
        foto(pg, f"classico-so-pintar-320-{esq}")
        ctx.close()

# Trilha Ao segurar: pressão por toque sintética (PointerEvent), igual em Chromium e WebKit; o clique que o navegador
# geraria ao soltar é simulado com el.click() para conferir que ele é consumido.
TOQUE_JS = """([code, tipo]) => { const el = document.querySelector(`#painel .card[data-code="${code}"]`); const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
        button: 0, buttons: tipo === 'pointerdown' ? 1 : 0, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }"""
def toque(pg, code, tipo): pg.evaluate(TOQUE_JS, [code, tipo])
def segura_mouse(pg, code, ms=650):
    pg.locator(f'#painel .card[data-code="{code}"]').hover(); pg.mouse.down(); pg.wait_for_timeout(ms)
APAGADO = {"self": [], "pre": [], "co": [], "libera": [], "ativo": False}

@v210
@caso("Trilha Ao segurar (padrão): mouse, teclado e toque mostram ao segurar e apagam ao soltar; marcações e Detalhes intactos; o clique curto seguinte funciona; cancela ao rolar e ao sair")
def t_trilha_segurar(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="trilha-segurar")
    grupo = pg.get_by_role("radiogroup", name="Trilha dos requisitos"); expect(grupo).to_be_visible()
    assert grupo.evaluate("e => e.classList.contains('seletor-modo')")                          # mesmo componente do seletor do topo
    for nome, on in (("Desligado", False), ("Ao segurar", True), ("Ao passar o mouse", False)):
        r = grupo.get_by_role("radio", name=nome, exact=True); assert r.is_checked() == on, nome
        assert r.evaluate("e => e.closest('label').querySelectorAll('svg.ico').length") == 1
        assert r.evaluate("e => getComputedStyle(e).opacity") == "0"                              # sem bolinha de rádio visível
    assert pg.locator("#ferramentas [data-trilha]").count() == 0 and "libera" in pg.locator(".leg-destaque").inner_text()
    # teclado: as setas alternam o segmento aceso; foco visível no rótulo
    trilha(pg, "segurar").focus(); pg.keyboard.press("ArrowRight")
    expect(trilha(pg, "foco")).to_be_checked(); assert ls(pg, "exibir")["destaque"] == "foco"
    assert foco_em(pg, 'input[name="trilha"][value="foco"]'), descreve_foco(pg)
    assert trilha(pg, "foco").evaluate("e => getComputedStyle(e.closest('label')).outlineStyle") != "none"
    pg.keyboard.press("ArrowLeft"); expect(trilha(pg, "segurar")).to_be_checked()
    assert pg.locator("#ferramentas .seletor-trilha input:checked").count() == 1
    marc = ls(pg, "marcacoes")
    pg.locator('#painel .card[data-code="MAC128"]').hover(); assert destaque(pg) == APAGADO     # passar o mouse não acende
    # mouse: segurar acende; soltar apaga, sem abrir Detalhes
    segura_mouse(pg, "MAC128")
    d = destaque(pg); assert d["self"] == ["MAC128"] and d["pre"] == ["MAC118"] and d["ativo"], d
    foto(pg, "trilha-segurando-mac128")
    pg.mouse.up(); assert destaque(pg) == APAGADO
    expect(pg.locator("#detalhes")).to_be_hidden(); assert ls(pg, "marcacoes") == marc
    pg.locator('#painel .card[data-code="MAC128"]').click(); expect(pg.locator("#detalhes")).to_be_visible()   # o clique curto seguinte abre
    assert destaque(pg) == APAGADO                                                             # abrir Detalhes não acende
    # soltar apaga mesmo com Detalhes aberto
    segura_mouse(pg, "COS231"); assert destaque(pg)["self"] == ["COS231"]; pg.mouse.up(); assert destaque(pg) == APAGADO
    pg.keyboard.press("Escape")
    # mover mais de 10 px antes de 400 ms cancela
    pg.locator('#painel .card[data-code="MAC128"]').hover(); pg.mouse.down(); pg.mouse.move(400, 400, steps=4); pg.wait_for_timeout(600)
    assert destaque(pg) == APAGADO; pg.mouse.up()
    # pincel: a pressão longa não pinta; o clique curto pinta
    pg.click('#paleta [data-pincel="cursando"]')
    segura_mouse(pg, "MAC248"); pg.mouse.up(); assert "MAC248" not in (ls(pg, "marcacoes") or {})
    pg.locator('#painel .card[data-code="MAC248"]').click(); assert ls(pg, "marcacoes").get("MAC248") == "cursando"
    pg.click('#paleta [data-pincel="__detalhes"]')
    # teclado: Espaço segurado mostra; soltar apaga; Espaço curto continua ativando
    card = pg.locator('#painel .card[data-code="MAC128"]'); card.focus(); assert destaque(pg) == APAGADO   # o foco não acende
    pg.keyboard.down(" "); pg.wait_for_timeout(650)
    assert destaque(pg)["self"] == ["MAC128"]; pg.keyboard.up(" ")
    assert destaque(pg) == APAGADO; expect(pg.locator("#detalhes")).to_be_hidden()
    card.focus(); pg.keyboard.press(" "); expect(pg.locator("#detalhes")).to_be_visible()
    pg.keyboard.press("Escape")
    # perder o foco durante o Espaço cancela
    card.focus(); pg.keyboard.down(" "); pg.evaluate("document.activeElement.blur()"); pg.wait_for_timeout(600); pg.keyboard.up(" ")
    assert destaque(pg) == APAGADO
    ctx.close()
    # toque (Chromium e WebKit com hasTouch), Clássico, 390 px: segurar mostra; soltar apaga sem pintar; o toque curto seguinte consulta
    if b.browser_type.name in ("chromium", "webkit"):
        ctx, pg = abre(b, vp=C, perfil=PERFIL, nome="trilha-toque", toque=True, modo="classico")
        toque(pg, "MAC248", "pointerdown"); pg.wait_for_timeout(650)
        assert destaque(pg)["self"] == ["MAC248"]
        foto(pg, "trilha-toque-classico-390")
        toque(pg, "MAC248", "pointerup"); pg.locator('#painel .card[data-code="MAC248"]').evaluate("e => e.click()")
        assert destaque(pg) == APAGADO and "MAC248" not in (ls(pg, "marcacoes") or {}) and pg.locator("#consulta").count() == 0
        pg.locator('#painel .card[data-code="MAC248"]').tap(); expect(pg.locator("#consulta")).to_be_visible()
        assert "MAC248" not in (ls(pg, "marcacoes") or {})
        pg.locator('#painel .card[data-code="MAC248"]').tap(); assert ls(pg, "marcacoes").get("MAC248") == "aprovada"
        # rolar durante a pressão cancela (a página continua rolando)
        y0 = pg.evaluate("scrollY")
        toque(pg, "COS231", "pointerdown"); pg.evaluate("window.scrollBy(0, 60)"); pg.wait_for_timeout(650)
        assert destaque(pg) == APAGADO and pg.evaluate("scrollY") > y0
        toque(pg, "COS231", "pointerup")
        assert pg.evaluate("getComputedStyle(document.querySelector('#painel .card')).touchAction") != "none"
        ctx.close()

@v210
@caso("Trilha: tabela de 3 modos × gatilhos (mouse, foco, Detalhes, ir para, segurar) na Grade; Linha do tempo continua com o destaque ao passar o mouse; setas de A ECI por trás da Grade continuam")
def t_trilha_modos(b):
    esperado = {"desligado": dict(hover=False, foco=False, detalhes=False, ir=False, segurar=False),
                "segurar": dict(hover=False, foco=False, detalhes=False, ir=False, segurar=True),
                "foco": dict(hover=True, foco=True, detalhes=True, ir=True, segurar=True)}
    observado = {}
    for modo in esperado:
        ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade", "exibir": {"destaque": modo}}, nome=f"trilha-{modo}")
        o = {}
        pg.locator('#painel .card[data-code="MAC128"]').hover(); o["hover"] = destaque(pg)["ativo"]; pg.mouse.move(2, 2)
        pg.locator('#painel .card[data-code="COS231"]').focus(); o["foco"] = destaque(pg)["ativo"]; pg.locator("#btn-config").focus()
        pg.locator('#painel .card[data-code="MAC128"]').click(); pg.mouse.move(2, 2); o["detalhes"] = destaque(pg)["ativo"]
        pg.locator("#detalhes [data-ir]").first.click(); pg.mouse.move(2, 2); o["ir"] = destaque(pg)["ativo"]
        pg.keyboard.press("Escape"); pg.mouse.move(2, 2)
        segura_mouse(pg, "MAC128"); o["segurar"] = destaque(pg)["ativo"]; pg.mouse.up()
        observado[modo] = o
        if modo == "segurar":
            # Linha do tempo: o destaque ao passar o mouse continua como antes
            pg.click('[data-vista="timeline"]'); pg.locator('#painel .card[data-code="MAC128"]').last.hover()
            assert destaque(pg)["self"], "Linha do tempo sem destaque ao passar o mouse"
            # A ECI por trás da Grade: o grafo continua com as setas
            pg.click('[data-vista="eci"]'); pg.locator('[data-eci-abrir="COS242"]').press("Enter")
            expect(pg.locator("#eci-grafo svg.setas")).to_have_count(1); pg.keyboard.press("Escape")
        ctx.close()
    assert observado == esperado, observado

@v210
@caso("Trilha: migração pela regra literal nas cinco origens (sem chave, foco, desligado, setas ocultas, setas foco/todas); recarregar duas vezes não muda nada; vale no Clássico")
def t_trilha_migracao(b):
    casos = [(None, "segurar", None), ({"destaque": "foco"}, "foco", {"destaque": "foco"}), ({"destaque": "desligado"}, "desligado", {"destaque": "desligado"}),
             ({"setas": "ocultas"}, "desligado", {"destaque": "desligado"}), ({"setas": "foco"}, "foco", {"destaque": "foco"}), ({"setas": "todas"}, "foco", {"destaque": "foco"})]
    for salvo, modo, gravado in casos:
        extra = {"vista": "grade"} | ({"exibir": salvo} if salvo else {})
        ctx, pg = abre(b, perfil=PERFIL, extra=extra, nome=f"trilha-migra-{modo}")
        guardado = ls(pg, "exibir")
        for _ in range(2):
            expect(trilha(pg, modo)).to_be_checked()
            assert pg.locator('#ferramentas .seletor-trilha input:checked').count() == 1, salvo
            atual = ls(pg, "exibir")
            assert (atual is None if gravado is None else {k: atual.get(k) for k in gravado} == gravado and "setas" not in atual), (salvo, atual)
            assert atual == guardado, (salvo, atual, guardado)
            pg.reload(); pronto(pg, "trilha-migra")
        ctx.close()
    # a escolha feita no Planejador vale no Clássico
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="trilha-classico")
    escolhe_trilha(pg, "foco"); assert ls(pg, "exibir")["destaque"] == "foco"
    alterna_modo(pg); pg.locator('#painel .card[data-code="MAC128"]').hover(); assert destaque(pg)["ativo"]
    alterna_modo(pg); escolhe_trilha(pg, "segurar"); alterna_modo(pg)
    pg.locator('#painel .card[data-code="MAC128"]').hover(); assert not destaque(pg)["ativo"]
    segura_mouse(pg, "MAC128"); assert destaque(pg)["self"] == ["MAC128"]; pg.mouse.up()
    assert "MAC128" not in (ls(pg, "marcacoes") or {})                                         # segurar no Clássico não pinta
    ctx.close()

FOLHA_JS = """() => { const d = document.querySelector('#detalhes'), r = d.getBoundingClientRect(), x = d.querySelector('.fechar').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, alt: innerHeight, xTop: x.top, xBottom: x.bottom, scrollTop: d.scrollTop, folha: d.classList.contains('folha'),
             role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), mainInerte: document.querySelector('main').inert,
             topoInerte: document.querySelector('.topo').inert, fundo: !document.querySelector('#detalhes-fundo').hidden,
             dentro: d.contains(document.activeElement) }; }"""
def abre_pela_consulta(pg, code):
    """Planejador, pincel escolhido: o primeiro toque consulta; "Detalhes" da consulta abre o painel."""
    pg.locator('#paleta [data-pincel="cursando"]').tap()
    pg.locator(f'#painel .card[data-code="{code}"]').tap(); expect(pg.locator("#consulta-detalhes")).to_be_visible()
    pg.locator("#consulta-detalhes").tap(); expect(pg.locator("#detalhes")).to_be_visible()

@v210
@caso("Detalhes no celular, disciplina pintada aberta pela consulta: o painel cabe inteiro na tela, com o topo e o botão de fechar visíveis (defeito do corte do topo)")
def t_folha_corte_topo(b):
    # Usa só controles que já existiam na v2.0.0, para comparar a base e o candidato no mesmo cenário.
    if b.browser_type.name not in ("chromium", "webkit"): return
    ctx, pg = abre(b, vp=C, perfil=PERFIL, extra={"vista": "grade", "marcacoes": {"COS231": "cursando"}}, nome="folha-corte", toque=True)
    abre_pela_consulta(pg, "COS231")
    pg.wait_for_timeout(300)
    # só o painel e o fechar (sem #detalhes-fundo, que não existe na v2.0.0). O corte não se reproduz no automatizado:
    # a v2.0.0 também fica verde aqui; a prova do defeito é por captura (limitação em docs/MUDANCAS.md).
    f = pg.evaluate("""() => { const d = document.querySelector('#detalhes'), r = d.getBoundingClientRect(), x = d.querySelector('.fechar').getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, alt: innerHeight, xTop: x.top, xBottom: x.bottom }; }""")
    foto(pg, "folha-corte-topo-390")
    assert f["top"] >= -0.5 and f["bottom"] <= f["alt"] + 0.5, f
    assert f["xTop"] >= -0.5 and f["xBottom"] <= f["alt"] + 0.5, f                 # o fechar está na tela
    ctx.close()

@v210
@caso("Folha de detalhes no celular (Chromium e WebKit com toque, 390×844, dois temas): inteira, rolagem interna, fundo, inert, role=dialog; foco preso; ✕, fundo e Esc fecham e o foco volta ao cartão; voltar a 1024 limpa; axe")
def t_folha_celular(b):
    if b.browser_type.name not in ("chromium", "webkit"): return
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C, perfil=PERFIL, esquema=esq, extra={"vista": "grade", "marcacoes": {"COS231": "cursando"}}, nome=f"folha-{esq}", toque=True)
        card = pg.locator('#painel .card[data-code="COS231"]')
        # abrir pelo toque no cartão (pincel em Detalhes): folha inteira, fundo, resto inerte, foco dentro
        card.tap(); expect(pg.locator("#detalhes")).to_be_visible(); pg.wait_for_timeout(300)
        f = pg.evaluate(FOLHA_JS)
        assert f["folha"] and f["role"] == "dialog" and f["modal"] == "true" and f["mainInerte"] and f["topoInerte"] and f["fundo"] and f["dentro"], f
        assert f["top"] >= -0.5 and f["bottom"] <= f["alt"] + 0.5 and f["xTop"] >= -0.5 and f["scrollTop"] == 0, f
        expect(pg.locator("#detalhes")).to_have_accessible_name(re.compile(r"\S"))
        foto(pg, f"folha-detalhes-390-{esq}")
        # rolagem interna: a folha rola, a página não
        y = pg.evaluate("scrollY"); pg.locator("#detalhes").evaluate("d => { d.scrollTop = 400; }")
        assert pg.evaluate("scrollY") == y
        # Tab e Shift+Tab circulam dentro
        for tecla in ("Tab", "Shift+Tab"):
            for _ in range(pg.locator("#detalhes button, #detalhes input").count() + 3):
                pg.keyboard.press(tecla); assert foco_em(pg, "#detalhes *"), (tecla, descreve_foco(pg))
        graves = axe_graves(pg); assert not graves, (esq, graves[:3])
        # Esc fecha e devolve o foco ao cartão
        pg.keyboard.press("Escape"); expect(pg.locator("#detalhes")).to_be_hidden()
        assert foco_em(pg, '#painel .card[data-code="COS231"]'), descreve_foco(pg)
        f = pg.evaluate("() => [document.querySelector('main').inert, document.querySelector('#detalhes-fundo').hidden, document.querySelector('#detalhes').getAttribute('role')]")
        assert f == [False, True, None], f
        # ✕ fecha
        card.tap(); expect(pg.locator("#detalhes")).to_be_visible()
        pg.locator("#detalhes .fechar").tap(); expect(pg.locator("#detalhes")).to_be_hidden()
        assert foco_em(pg, '#painel .card[data-code="COS231"]'), descreve_foco(pg)
        # toque no fundo fecha
        card.tap(); expect(pg.locator("#detalhes")).to_be_visible()
        pg.touchscreen.tap(195, 10); expect(pg.locator("#detalhes")).to_be_hidden()
        assert foco_em(pg, '#painel .card[data-code="COS231"]'), descreve_foco(pg)
        # pela consulta (disciplina pintada): o foco volta ao cartão consultado
        abre_pela_consulta(pg, "COS231"); pg.keyboard.press("Escape")
        assert foco_em(pg, '#painel .card[data-code="COS231"]'), descreve_foco(pg)
        pg.click('#paleta [data-pincel="__detalhes"]')
        # mudar a janela para 1024 com a folha aberta: volta a ser o painel lateral e a página deixa de ser inerte
        card.tap(); expect(pg.locator("#detalhes")).to_be_visible()
        pg.set_viewport_size({"width": 1024, "height": 800}); pg.wait_for_timeout(200)
        f = pg.evaluate(FOLHA_JS)
        assert not f["folha"] and not f["mainInerte"] and not f["fundo"] and f["role"] is None, f
        pg.set_viewport_size(C); pg.wait_for_timeout(200)
        assert pg.evaluate(FOLHA_JS)["folha"]
        ctx.close()

@v210
@caso("Folha no celular: tocar no fundo em cima de um cartão só fecha a folha e devolve o foco ao cartão de origem, sem abrir os detalhes do cartão de baixo")
def t_folha_fundo_nao_atravessa(b):
    if b.browser_type.name not in ("chromium", "webkit"): return
    ctx, pg = abre(b, vp=C, perfil=PERFIL, extra={"vista": "grade"}, nome="folha-fundo", toque=True)
    for x in (100, 300):
        # rola até haver cartões no alto da tela, sob o ponto do toque
        pg.evaluate("""() => { const c = document.querySelector('#painel .col-cards .card[data-code]');
            window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 20); }""")
        pg.wait_for_timeout(150)
        baixo = pg.evaluate(f"(() => {{ const e = document.elementFromPoint({x}, 40); const c = e && e.closest('.card[data-code]'); return c ? c.dataset.code : null; }})()")
        assert baixo, ("nenhum cartão sob o ponto", x)
        origem = pg.evaluate(f"""(() => {{ const cs = [...document.querySelectorAll('#painel .card[data-code]')].filter((c) => {{ const r = c.getBoundingClientRect();
            return r.top > 200 && r.bottom < innerHeight - 140 && c.dataset.code !== '{baixo}'; }}); return cs[0].dataset.code; }})()""")
        pg.locator(f'#painel .card[data-code="{origem}"]').tap(); expect(pg.locator("#detalhes")).to_be_visible()
        assert pg.locator("#detalhes").get_attribute("data-alvo") == f"c:{origem}"
        pg.touchscreen.tap(x, 40); pg.wait_for_timeout(400)
        expect(pg.locator("#detalhes")).to_be_hidden()                                          # não reabriu com o cartão de baixo
        assert foco_em(pg, f'#painel .card[data-code="{origem}"]'), (x, descreve_foco(pg))
        assert pg.evaluate("document.querySelector('main').inert") is False
    ctx.close()

@v210
@caso("Clique fora fecha os detalhes da disciplina e o editor de tags; clique dentro mantém (chip que redesenha, edição preservada); outro cartão troca; prévia do SIGA, Privacidade e diálogo de confirmação não fecham")
def t_clique_fora(b):
    if b.browser_type.name not in ("chromium", "webkit"): return
    decl = {"periodos": [{"nome": "2025/1", "disciplinas": ["COS110"]}], "aprovacoesDeclaradas": [{"code": "MAC118", "registradoEm": "2026-11-27"}]}
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="clique-fora")
    det = pg.locator("#detalhes")
    # disciplina: clique fora fecha
    pg.locator('#painel .card[data-code="MAC128"]').click(); expect(det).to_be_visible()
    pg.locator("#titulo").click(); expect(det).to_be_hidden()
    # clique dentro mantém; o chip de tag redesenha o painel e ele continua aberto
    pg.locator('#painel .card[data-code="MAC128"]').click()
    pg.locator("#detalhes h3").click(); expect(det).to_be_visible()
    pg.locator('#detalhes [data-settag][data-tag="planejada"]').click(); expect(det).to_be_visible()
    assert ls(pg, "marcacoes").get("MAC128") == "planejada"
    # outro cartão troca o conteúdo, sem fechar
    pg.locator('#painel .card[data-code="COS231"]').click(); expect(det).to_be_visible()
    assert det.get_attribute("data-alvo") == "c:COS231"
    pg.locator(".rodape").click(position={"x": 5, "y": 5}); expect(det).to_be_hidden()
    # editor de tags: clique dentro preserva a edição; clique fora fecha
    pg.click("#editar-tags"); expect(det).to_contain_text("Tags de cor")
    pg.fill('#detalhes [data-tagnome="0"]', "Feita"); pg.locator("#detalhes h3").click()
    expect(det).to_be_visible(); expect(pg.locator('#detalhes [data-tagnome="0"]')).to_have_value("Feita")
    pg.locator("#titulo").click(); expect(det).to_be_hidden(); assert ls(pg, "tags")[0]["nome"] == "Feita"
    # Privacidade não fecha por clique fora
    pg.click("#btn-privacidade"); expect(det).to_be_visible(); pg.locator("#titulo").click(); expect(det).to_be_visible()
    pg.keyboard.press("Escape")
    # prévia do SIGA aberta não fecha por clique fora
    gera(pg, ["historico-ficticio.pdf", "boa-ficticio.pdf"]); expect(pg.locator("#siga-usar")).to_be_visible()
    pg.locator("#titulo").click(); expect(pg.locator("#siga-usar")).to_be_visible()
    pg.locator("#detalhes .fechar").click()
    ctx.close()
    # diálogo de confirmação aberto a partir dos detalhes: clicar nele não fecha o painel
    ctx, pg = abre(b, perfil=decl, extra={"vista": "grade"}, nome="clique-fora-confirma", relogio=HOJE)
    det = pg.locator("#detalhes")
    pg.locator('#painel .card[data-code="MAC118"]').click(); expect(det).to_be_visible()
    pg.locator("#detalhes [data-decl-remover]").click(); expect(pg.locator("#dlg-confirma")).to_be_visible()
    pg.locator('#dlg-confirma button[value=""]').click(); expect(pg.locator("#dlg-confirma")).to_be_hidden()
    expect(det).to_be_visible()
    ctx.close()

MOVE_JS = """([code, tipo, dx]) => { const el = document.querySelector(`#painel .card[data-code="${code}"]`); const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
        button: tipo === 'pointermove' ? -1 : 0, buttons: tipo === 'pointerup' || tipo === 'pointercancel' ? 0 : 1, clientX: r.x + r.width / 2 + dx, clientY: r.y + r.height / 2 })); }"""

@v210
@caso("Trilha Ao segurar: depois que a trilha acendeu, mover dentro ou sair do cartão, esperar mais de 700 ms e soltar não pinta nem abre Detalhes (mouse, toque, Espaço, pointercancel); o clique curto seguinte funciona")
def t_trilha_soltar_tarde(b):
    # Clássico sem perfil, pincel padrão (Cursada): era aqui que o clique escapava depois de 700 ms
    ctx, pg = abre(b, nome="trilha-soltar-tarde", modo="classico")
    card = pg.locator('#painel .card[data-code="MAC248"]')
    caixa = card.bounding_box(); cx, cy = caixa["x"] + caixa["width"] / 2, caixa["y"] + caixa["height"] / 2
    # mouse: acende, move 12 px dentro do cartão, espera 900 ms e solta
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.wait_for_timeout(650)
    assert destaque(pg)["self"] == ["MAC248"]
    pg.mouse.move(cx + 12, cy, steps=3); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(150)
    assert (ls(pg, "marcacoes") or {}) == {}, ls(pg, "marcacoes"); expect(pg.locator("#detalhes")).to_be_hidden()
    # mouse: sai do cartão e volta, espera e solta em cima dele
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.wait_for_timeout(650)
    pg.mouse.move(cx, cy - caixa["height"] * 2, steps=3); pg.mouse.move(cx, cy, steps=3); pg.wait_for_timeout(900); pg.mouse.up(); pg.wait_for_timeout(150)
    assert (ls(pg, "marcacoes") or {}) == {}, ls(pg, "marcacoes")
    # o clique curto seguinte pinta
    card.click(); assert ls(pg, "marcacoes") == {"MAC248": "aprovada"}
    pg.click('#paleta [data-pincel=""]'); card.click(); pg.click('#paleta [data-pincel="aprovada"]')
    antes = ls(pg, "marcacoes")
    # Espaço: acende, perde o foco e volta; soltar não ativa
    card.focus(); pg.keyboard.down(" "); pg.wait_for_timeout(650); assert destaque(pg)["self"] == ["MAC248"]
    pg.wait_for_timeout(900); pg.keyboard.up(" "); pg.wait_for_timeout(150)
    assert ls(pg, "marcacoes") == antes, ls(pg, "marcacoes")
    ctx.close()
    if b.browser_type.name in ("chromium", "webkit"):
        ctx, pg = abre(b, vp=C, nome="trilha-soltar-tarde-toque", toque=True, modo="classico")
        el = pg.locator('#painel .card[data-code="MAC248"]')
        # toque: acende, move 12 px, espera 900 ms, solta; o clique que o navegador geraria é consumido
        pg.evaluate(MOVE_JS, ["MAC248", "pointerdown", 0]); pg.wait_for_timeout(650); assert destaque(pg)["self"] == ["MAC248"]
        pg.evaluate(MOVE_JS, ["MAC248", "pointermove", 12]); pg.wait_for_timeout(900); pg.evaluate(MOVE_JS, ["MAC248", "pointerup", 12])
        el.evaluate("e => e.click()")
        assert (ls(pg, "marcacoes") or {}) == {} and pg.locator("#consulta").count() == 0, ls(pg, "marcacoes")
        # pointercancel depois de acender: nada é ativado, e o toque curto seguinte consulta
        pg.evaluate(MOVE_JS, ["MAC248", "pointerdown", 0]); pg.wait_for_timeout(650); pg.evaluate(MOVE_JS, ["MAC248", "pointercancel", 0])
        assert destaque(pg)["self"] == []
        el.tap(); expect(pg.locator("#consulta")).to_be_visible(); assert (ls(pg, "marcacoes") or {}) == {}
        ctx.close()

@v210
@caso("Trilha Ao segurar com o mouse: uma rolagem pequena da página (menor que a tolerância) não cancela; rolar de verdade cancela")
def t_trilha_rolagem_pequena(b):
    ctx, pg = abre(b, vp={"width": 1440, "height": 700}, perfil=PERFIL, extra={"vista": "grade"}, nome="trilha-rolagem")
    pg.evaluate("window.scrollTo(0, 120)")
    card = pg.locator('#painel .card[data-code="MAC128"]'); card.scroll_into_view_if_needed()
    caixa = card.bounding_box(); pg.mouse.move(caixa["x"] + caixa["width"] / 2, caixa["y"] + caixa["height"] / 2)
    pg.mouse.down(); pg.evaluate("window.scrollBy(0, 3)"); pg.wait_for_timeout(650)
    assert destaque(pg)["self"] == ["MAC128"], "uma rolagem de 3 px cancelou a pressão"
    pg.mouse.up(); assert destaque(pg) == APAGADO
    pg.mouse.down(); pg.evaluate("window.scrollBy(0, 60)"); pg.wait_for_timeout(650)
    assert destaque(pg) == APAGADO; pg.mouse.up()
    ctx.close()

@v210
@caso("Clássico: os blocos sem código (Humanas, optativas, livre escolha, ACE) não abrem Detalhes, nem pelo mouse nem pelo teclado")
def t_classico_blocos_sem_detalhes(b):
    ctx, pg = abre(b, perfil=PERFIL, nome="classico-blocos", modo="classico")
    blocos = pg.locator("#painel .card.bloco")
    assert blocos.count() > 0
    humanas = blocos.filter(has_text="Humanas").first
    humanas.click(); pg.wait_for_timeout(150); expect(pg.locator("#detalhes")).to_be_hidden()
    humanas.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(150); expect(pg.locator("#detalhes")).to_be_hidden()
    pg.keyboard.press(" "); pg.wait_for_timeout(150); expect(pg.locator("#detalhes")).to_be_hidden()
    for i in range(blocos.count()):
        blocos.nth(i).click(); pg.wait_for_timeout(80)
        expect(pg.locator("#detalhes")).to_be_hidden()
    assert pg.locator("#detalhes [data-creditos]").count() == 0
    # no Planejador, o bloco continua abrindo os créditos extras
    alterna_modo(pg); pg.click('[data-vista="grade"]')
    pg.locator("#painel .card.bloco").filter(has_text="Humanas").first.click()
    expect(pg.locator("#detalhes [data-creditos]")).to_have_count(1)
    ctx.close()

@v210
@caso("Optativas a 320 px, Ícone + texto: os grupos e os filtros não rolam de lado, também com uma inativa planejada e Todas acesas ligada")
def t_optativas_320(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "optativas", "filtros": {"ativas": False}}, nome="optativas-320-obr")
    alvo = pg.locator(".opt.opt-inativa").first.get_attribute("data-code"); ctx.close()
    perfil = json.loads(json.dumps(PERFIL)); perfil["periodos"][4]["disciplinas"].append(alvo)
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C320, perfil=perfil, extra={"vista": "optativas"}, nome=f"optativas-320-{esq}", esquema=esq, toque=True)
        assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
        pg.get_by_role("button", name="Todas acesas", exact=True).click()
        for g in ("Humanas", "ACE (extensão)", "Condicionada"):
            pg.get_by_role("button", name=g, exact=True).click()
            assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1, g
            direita = pg.locator(".filtros .seg").evaluate("e => e.getBoundingClientRect().right")
            assert direita <= 320 + 0.5, (g, direita)
        foto(pg, f"optativas-320-{esq}")
        ctx.close()

PERFIS_FASE = {
    "calouro": {"periodos": [{"nome": "2025/2", "disciplinas": ["COS110", "COS111"]}, {"nome": "2026/2", "atual": True, "disciplinas": ["MAC118"]}]},
    "meio": {"periodos": [{"nome": n, "disciplinas": [c]} for n, c in (("2024/1", "COS110"), ("2024/2", "COS111"), ("2025/1", "EEL280"))]},
}
def perfil_veterano(pg):
    """Veterano de verdade (75% ou mais registrado): as obrigatórias e optativas, como em t_motivacao."""
    feitas = [c for c, _, _ in obrigatorias(pg) if c not in ("EEWX00", "EEWU00")]
    return {"periodos": [{"nome": "2025/1", "disciplinas": feitas + [{"code": "XYZ201", "name": "Optativa fictícia", "credits": 30, "category": 2}]},
                         {"nome": "2026/2", "atual": True, "disciplinas": ["EEWX00", {"code": "XYZ202", "name": "Optativa fictícia II", "credits": 10, "category": 2}]},
                         {"nome": "2027/1", "planejado": True, "disciplinas": ["EEWU00", {"code": "XYZ301", "name": "Livre fictícia", "credits": 8, "category": 3},
                                                                          {"code": "XYZ401", "name": "Humanas fictícia", "credits": 4, "category": 4}]}],
            "extensao": [{"nome": "Projeto de extensão fictício", "horas": 405, "periodo": "2027/1", "status": "planejada"}]}

@v210
@caso("Aba Conquistas no Foco: aba por teclado (role=tab, aria-selected, painel associado), depois de Cronograma; Situação à esquerda (em cima a 320 px); cartões por grupo com 'N de M'; 3 fases × 2 tons; nome ausente, longo e com <b>; dois temas; axe")
def t_aba_conquistas(b):
    base = {"vista": "timeline", "foco": True}
    ctx, pg = abre(b, perfil=PERFIL, extra=base, nome="aba-conquistas", relogio=HOJE)
    abas = pg.evaluate("[...document.querySelectorAll('.abas [role=tab]')].filter((e) => !e.hidden).map((e) => e.dataset.vista)")
    assert abas == ["grade", "timeline", "cronograma", "conquistas"], abas
    aba = pg.locator("#aba-conquistas")
    assert aba.get_attribute("aria-controls") == "painel" and aba.locator("svg.ico").count() == 1
    pg.locator('.abas [data-vista="cronograma"]').click(); pg.locator('.abas [data-vista="cronograma"]').focus(); pg.keyboard.press("ArrowRight")
    expect(aba).to_have_attribute("aria-selected", "true"); assert foco_em(pg, "#aba-conquistas")
    expect(pg.locator("#painel")).to_have_attribute("role", "tabpanel"); expect(pg.locator("#painel")).to_have_attribute("aria-labelledby", "aba-conquistas")
    expect(pg.locator("#painel .cartao-fase")).to_be_visible(); expect(pg.locator("#painel .estante")).to_be_visible()
    assert pg.locator("#painel details").count() == 0 and pg.locator("#barra-geral").is_hidden() and pg.locator("#paleta").is_hidden()
    sit, est = pg.locator("#painel .cq-situacao").bounding_box(), pg.locator("#painel .estante").bounding_box()
    assert sit["x"] + sit["width"] <= est["x"] + 1 and abs(sit["y"] - est["y"]) < 40, (sit, est)          # Situação à esquerda
    grupos = pg.locator("#painel .cq-grupo h3").all_text_contents()
    assert len(grupos) == 4 and all(re.search(r" · \d+ de \d+$", g) for g in grupos), grupos
    assert pg.locator("#painel .selo .selo-barra").count() == pg.locator("#painel .selo").count()
    obt = pg.locator("#painel .selo.s-obtido .selo-barra i").first
    if obt.count(): assert obt.evaluate("e => e.style.width") == "100%"
    expect(pg.locator("#painel .cq-cabeca")).to_have_text("Bora, Ana 💪")                       # o perfil fictício chama Ana
    for esq in ("light", "dark"):
        pg.emulate_media(color_scheme=esq); foto(pg, f"aba-conquistas-1440-{esq}", full=True)
        graves = axe_graves(pg, contexto="#painel"); assert not graves, (esq, graves[:3])
    ctx.close()
    # 3 fases × 2 tons: cabeçalho e conteúdo da fase
    ctx, pg = abre(b, perfil={"periodos": []}, nome="aba-conquistas-obr", relogio=HOJE); vet = perfil_veterano(pg); ctx.close()
    perfis = {**PERFIS_FASE, "veterano": vet}
    titulos = {"calouro": "🌱 Calouro", "meio": "🏋️ Meio do curso", "veterano": "🎓 Veterano"}
    proprio = {"calouro": "Primeiros passos", "meio": "Optativas:", "veterano": "Checklist da formatura"}
    for fase, perfil in perfis.items():
        for tom in ("zoeira", "discreto"):
            p = {**perfil, "nome": "Bia"}
            ctx, pg = abre(b, perfil=p, extra={"vista": "conquistas", "foco": True, "tom": tom}, nome=f"aba-conquistas-{fase}-{tom}", relogio=HOJE)
            expect(pg.locator("#painel .cq-cabeca")).to_have_text("Bora, Bia 💪" if tom == "zoeira" else "Situação · Bia")
            expect(pg.locator("#painel #fase-titulo")).to_contain_text(titulos[fase])
            expect(pg.locator("#painel .cartao-fase")).to_contain_text(proprio[fase]); expect(pg.locator("#painel .previsao")).to_be_visible()
            ctx.close()
    # sem nome; nome longo a 320 px; nome com <b> é texto
    ctx, pg = abre(b, perfil=PERFIS_FASE["meio"], extra={"vista": "conquistas", "foco": True}, nome="aba-conquistas-sem-nome", relogio=HOJE)
    expect(pg.locator("#painel .cq-cabeca")).to_have_text("Bora 💪")
    abre_config(pg); pg.check('#dlg-config input[name="tom"][value="discreto"]'); pg.keyboard.press("Escape")
    expect(pg.locator("#painel .cq-cabeca")).to_have_text("Situação")
    ctx.close()
    longo = {**PERFIS_FASE["meio"], "nome": "Maria Eduarda Fictícia de Albuquerque Cavalcanti Nogueira <b>negrito</b>"}
    for esq in ("light", "dark"):
        ctx, pg = abre(b, vp=C320, perfil=longo, extra={"vista": "conquistas", "foco": True}, nome=f"aba-conquistas-320-{esq}", relogio=HOJE, toque=True, esquema=esq)
        cab = pg.locator("#painel .cq-cabeca")
        expect(cab).to_contain_text("<b>negrito</b>"); assert cab.locator("b").count() == 0
        assert pg.evaluate("document.documentElement.scrollWidth - innerWidth") <= 1
        sit, est = pg.locator("#painel .cq-situacao").bounding_box(), pg.locator("#painel .estante").bounding_box()
        assert sit["y"] + sit["height"] <= est["y"] + 1, (sit, est)                                    # Situação em cima
        cortes = pg.locator("#painel .estante .selo").evaluate_all("es => es.filter((e) => e.scrollWidth > e.clientWidth + 1).length")
        assert cortes == 0, cortes
        colunas = pg.locator("#painel .estante-lista").first.evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
        assert colunas in (1, 2), colunas
        foto(pg, f"aba-conquistas-320-{esq}", full=True)
        ctx.close()

@v210
@caso("Conquistas fora do Foco: padrão só no Foco; Configurações → também fora do Foco persiste; sem perfil, 'Bora 💪' com orientação")
def t_conquistas_fora_do_foco(b):
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "grade"}, nome="conquistas-fora")
    expect(pg.locator("#aba-conquistas")).to_be_hidden()
    abre_config(pg); expect(pg.locator('#dlg-config input[name="conquistas"][value="foco"]')).to_be_checked()
    pg.check('#dlg-config input[name="conquistas"][value="sempre"]'); pg.keyboard.press("Escape")
    assert ls(pg, "conquistasFora") is True; expect(pg.locator("#aba-conquistas")).to_be_visible()
    pg.reload(); pronto(pg, "conquistas-fora"); expect(pg.locator("#aba-conquistas")).to_be_visible()
    abre_conquistas(pg); expect(pg.locator("#painel .cartao-fase")).to_be_visible()
    alterna_modo(pg); expect(pg.locator("#aba-conquistas")).to_be_hidden()                       # o Clássico não tem a aba
    ctx.close()
    ctx, pg = abre(b, extra={"vista": "grade", "conquistasFora": True}, nome="conquistas-sem-perfil", atalhos=False)
    abre_conquistas(pg)
    expect(pg.locator("#painel .cq-cabeca")).to_have_text("Bora 💪")
    expect(pg.locator("#painel .cq-situacao")).to_contain_text("Crie ou importe um perfil no Planejador")
    assert pg.locator("#painel .cartao-fase, #painel .estante").count() == 0
    abre_config(pg); pg.check('#dlg-config input[name="tom"][value="discreto"]'); pg.keyboard.press("Escape")
    expect(pg.locator("#painel .cq-cabeca")).to_have_text("Situação")
    ctx.close()

AVISO_ABA = "A aba Conquistas fica escondida; você está na Grade"

@v210
@caso("A aba Conquistas some (um caso por gatilho): desligar o Foco, rádio em Configurações, descartar o perfil, recarregar com vista conquistas; volta à Grade, foco no controle e anúncio")
def t_conquistas_some(b):
    # desligar o Foco com a aba aberta
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "conquistas", "foco": True}, nome="some-foco", relogio=HOJE)
    expect(pg.locator("#aba-conquistas")).to_have_attribute("aria-selected", "true")
    pg.locator("#btn-foco").focus(); pg.keyboard.press("Enter")
    expect(pg.locator("#aba-conquistas")).to_be_hidden(); expect(pg.locator("#aba-grade")).to_have_attribute("aria-selected", "true")
    assert foco_em(pg, "#btn-foco"), descreve_foco(pg)
    expect(pg.locator("#anuncio")).to_contain_text("Foco desligado"); expect(pg.locator("#anuncio")).to_contain_text(AVISO_ABA)
    assert ls(pg, "vista") == "grade"
    ctx.close()
    # rádio em Configurações (fora do Foco)
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "conquistas", "conquistasFora": True}, nome="some-config", relogio=HOJE)
    expect(pg.locator("#aba-conquistas")).to_have_attribute("aria-selected", "true")
    abre_config(pg); pg.locator('#dlg-config input[name="conquistas"][value="foco"]').check()
    assert foco_em(pg, '#dlg-config input[name="conquistas"], #dlg-config'), descreve_foco(pg)   # WebKit não foca o rádio no clique
    expect(pg.locator("#anuncio")).to_contain_text(AVISO_ABA); pg.keyboard.press("Escape")
    expect(pg.locator("#aba-conquistas")).to_be_hidden(); expect(pg.locator("#aba-grade")).to_have_attribute("aria-selected", "true")
    assert ls(pg, "conquistasFora") is None
    ctx.close()
    # descartar o perfil salvo
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "conquistas", "foco": True}, nome="some-descartar", relogio=HOJE)
    pg.once("dialog", lambda d: d.accept()); pg.locator("#descartar-importado").click()
    expect(pg.locator("#aba-conquistas")).to_be_hidden(); expect(pg.locator("#aba-grade")).to_have_attribute("aria-selected", "true")
    expect(pg.locator("#anuncio")).to_contain_text(AVISO_ABA)
    ctx.close()
    # recarregar com a vista salva e a aba indisponível
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "conquistas"}, nome="some-recarga", relogio=HOJE)
    expect(pg.locator("#aba-grade")).to_have_attribute("aria-selected", "true"); expect(pg.locator("#aba-conquistas")).to_be_hidden()
    assert ls(pg, "vista") == "grade"
    ctx.close()
    # foco na própria aba quando ela some: vai para a aba Grade
    ctx, pg = abre(b, perfil=PERFIL, extra={"vista": "conquistas", "conquistasFora": True}, nome="some-foco-na-aba", relogio=HOJE)
    pg.locator("#aba-conquistas").focus()
    pg.evaluate("""() => { const r = document.createElement('input'); r.type = 'radio'; r.name = 'conquistas'; r.value = 'foco'; r.hidden = true;
        document.body.append(r); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); r.remove(); }""")   # mesma mudança de Configurações, sem tirar o foco da aba
    expect(pg.locator("#aba-conquistas")).to_be_hidden(); assert foco_em(pg, "#aba-grade"), descreve_foco(pg)
    ctx.close()

@v210
@caso("Selo novo com a aba fechada: Registrar marcações anuncia a conquista uma vez; abrir a aba mostra .novo; recarregar não repete")
def t_conquistas_aviso_aba_fechada(b):
    perfil = {"periodos": [{"nome": "2025/1", "disciplinas": ["MAC118", "MAC128", "MAC238"]}, {"nome": "2026/2", "atual": True, "disciplinas": []}]}
    ctx, pg = abre(b, perfil=perfil, extra={"vista": "grade", "foco": True, "marcacoes": {"MAC248": "aprovada"}}, nome="aviso-aba-fechada", relogio=HOJE)
    pg.wait_for_timeout(200); pg.evaluate("document.querySelector('#anuncio').textContent = ''")
    anuncios = []
    pg.expose_function("registraAnuncio", lambda t: anuncios.append(t))
    pg.evaluate("""() => new MutationObserver(() => { const t = document.querySelector('#anuncio').textContent; if (t) window.registraAnuncio(t); })
        .observe(document.querySelector('#anuncio'), { childList: true, characterData: true, subtree: true })""")
    abre_registro(pg); pg.get_by_role("button", name=re.compile(r"^Gravar 1 aprova")).click()
    expect(pg.locator("#reg-resultado")).to_have_text("1 aprovação registrada por você.")
    expect(pg.locator("#anuncio")).to_contain_text("Rei dos Cálculos")
    pg.wait_for_timeout(300)
    assert sum("Rei dos Cálculos" in t for t in anuncios) == 1, anuncios
    assert pg.locator("#reg-resultado").count() == 1
    pg.get_by_role("button", name="Fechar").click()
    abre_conquistas(pg)
    expect(pg.locator("#painel .selo.novo", has_text="Rei dos Cálculos")).to_have_count(1)
    pg.evaluate("document.querySelector('#anuncio').textContent = ''")
    pg.reload(); pronto(pg, "aviso-aba-fechada"); pg.wait_for_timeout(300)
    assert "Rei dos Cálculos" not in pg.locator("#anuncio").inner_text()
    assert pg.locator("#painel .selo.novo").count() == 0
    ctx.close()

CASOS += CASOS6


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
