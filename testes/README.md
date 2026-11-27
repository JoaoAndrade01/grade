# Testes da Grade ECI

A verificação de uma versão reúne cinco suítes. O plano, a matriz de rastreabilidade e a lista de verificação estão em
[docs/PLANO-DE-TESTE.md](../docs/PLANO-DE-TESTE.md); os casos, em [docs/REQUISITOS.md](../docs/REQUISITOS.md).

| Suíte | O que verifica | Arquivos | Como rodar | Resultado esperado |
| --- | --- | --- | --- | --- |
| Interface (matriz) | Os casos dos requisitos no navegador, com dados fictícios | `runner.py`, `fluxos.py`, `reimportacao.py`, `auditoria.py` | "Rodar a matriz", nos seis pares | 97 cenários por `file://` e 98 por HTTP, sem evento inesperado |
| Paridade do importador | Que o importador em JavaScript e o em Python geram o mesmo perfil | `../ferramentas/testar_paridade.sh` | "Rodar a paridade do importador" | As quatro combinações iguais |
| Oráculos do importador | Que as duas saídas batem com perfis esperados escritos à mão | `importador.py`, `fixtures/oraculos.json` | `python -B testes/importador.py` | Todos os cenários verdes |
| Validador dos dados de referência (RF-17) | Formato, códigos e duplicatas de `js/horarios.js` e `js/guia.js` | `referencia_casos.py`, `referencia.py`, `fixtures/excecoes-referencia.json` | "Validar os dados de referência" | Todos os casos verdes |
| Acessibilidade (axe-core) | Regras WCAG A e AA, contraste, alvos e papéis ARIA, no recorte de telas | casos de `fluxos.py` que usam o axe | Dentro da matriz; "Axe-core" | Sem ocorrência grave ou crítica |

A matriz reúne 93 cenários de interface (`fluxos.py`) e os cinco do kit de reimportação. Os casos A a D testam a
preservação de anotações e a igualdade entre baixar e aplicar; o caso P ensaia a publicação com HTTP estático sob
`/grade/` e só roda por HTTP, por isso a contagem é 97 por `file://` e 98 por HTTP. Os casos de acessibilidade (foco,
nomes, contraste, refluxo, alvos, papéis ARIA, mensagens do PDF e o recorte do axe) e o de turmas sem código vêm da
inspeção de experiência de uso e acessibilidade feita antes da publicação.

O executor testa a versão indicada por `--ref`. Ele exporta apenas os caminhos
públicos do commit para uma cópia fora do checkout. Os PDFs são gerados das
fontes fictícias em `fixtures/`. Relatórios, arquivos baixados e capturas ficam
em `--out`, que deve apontar para um diretório novo fora do repositório. No
Windows, use um caminho local sem prefixo de dispositivo ou UNC. Use sempre
fixtures fictícias.

## Instalar no Windows

Na raiz do repositório, com Python 3.12 e Git. Para a paridade também são
necessários Git Bash e Node. O exemplo usa uma pasta irmã do checkout.

```powershell
$gradeRuntime = Join-Path (Split-Path -Parent (Get-Location).Path) '.b11-runtime'
New-Item -ItemType Directory -Force "$gradeRuntime\tmp" | Out-Null
$env:TEMP = "$gradeRuntime\tmp"
$env:TMP = $env:TEMP
$env:PLAYWRIGHT_BROWSERS_PATH = "$gradeRuntime\browsers"
python -m venv "$gradeRuntime\venv"
$gradePython = "$gradeRuntime\venv\Scripts\python.exe"
& $gradePython -m pip install -r testes/requirements.txt
& $gradePython -m playwright install chromium firefox webkit
```

## Rodar a matriz

Na mesma sessão PowerShell, com as variáveis acima, rode os seis pares.
Alterar `$gradeRef` para avaliar outro commit.

```powershell
$gradeRef = 'HEAD'
$gradeRun = Join-Path $env:TEMP ("grade-" + [guid]::NewGuid().ToString("N"))
foreach ($browser in 'chromium', 'firefox', 'webkit') {
    foreach ($transport in 'file', 'http') {
        $out = Join-Path $gradeRun "$browser-$transport"
        & $gradePython -B testes/runner.py --ref $gradeRef --browser $browser --transport $transport --out $out
        if ($LASTEXITCODE -ne 0) { Write-Warning "Falha em $browser/$transport. Confira a saída e o relatório." }
    }
}
```

O terminal resume os casos. `resultado.json` contém o hash do app, o SHA-256
da suíte e das fixtures, a versão do motor, a contagem esperada, as falhas e os
eventos de navegação. Os avisos do console ficam no campo `avisos`. Falhas de
cenário, eventos inesperados ou uma contagem diferente da esperada retornam
código diferente de zero. No Firefox, os casos móveis usam
viewport estreito e simulação de toque. A opção `is_mobile` do Playwright não se
aplica a esse motor. Nenhuma dessas execuções substitui o teste em iPhone real.

O monitor restringe à cópia pública as requisições `file://` que o Playwright
intercepta. No Firefox 159.0, o Playwright 1.65.2 deixa a carga local de scripts
fora dos eventos de requisição e do roteamento. Nesse par, a cópia pública limita
os arquivos preparados para o teste, e o monitor cobre o console e os erros de
página. O ensaio por HTTP verifica as requisições pelo monitor nesse motor.

## Axe-core (acessibilidade)

O axe-core fica fora do repositório. Instale a versão 4.10.3 numa pasta irmã do
checkout (`.b11-runtime/axe`) ou aponte `GRADE_AXE` para o `axe.min.js`:

```powershell
$gradeAxe = Join-Path $gradeRuntime 'axe'
New-Item -ItemType Directory -Force $gradeAxe | Out-Null
npm install --prefix $gradeAxe axe-core@4.10.3
$env:GRADE_AXE = Join-Path $gradeAxe 'node_modules/axe-core/axe.min.js'   # opcional: este é o caminho padrão
```

Os casos de contraste, de alvos e de papéis ARIA e o caso "Axe-core no recorte da inspeção" usam o axe. Sem
ele, esses casos falham com a mensagem do caminho procurado.

## Validar os dados de referência

```powershell
& $gradePython -B testes/referencia_casos.py
```

Roda os casos 17a a 17e (dados fictícios) e valida `js/horarios.js` e `js/guia.js`
(formato, códigos contra currículo, catálogo e `fixtures/excecoes-referencia.json`,
duplicatas, turmas sem código). Com `--browser chromium --transport file --out <dir novo>`
roda também o 17f no navegador. `testes/referencia.py` valida só os dados reais.
A gramática do horário é estrita (`seg|ter|qua|qui|sex HH-HH`, só dígitos ASCII, sem
espaço sobrando nem LF final). Exceção sem uso numa fonte gera aviso por fonte e não
falha; o efeito `entra-no-calculo` não vale para nome sem código.

## Rodar a paridade do importador

Para comparar o mesmo commit, confirme que o checkout dos importadores
corresponde a `$gradeRef`. Em Git Bash, use o Python do ambiente acima em
`GRADE_PYTHON` e os PDFs fictícios gerados em qualquer uma das saídas da matriz.

```bash
export GRADE_PYTHON='/c/caminho/para/.b11-runtime/venv/Scripts/python.exe'
fx='/c/caminho/para/uma-saida-da-matriz/fixtures-pdf'
hist="$fx/historico-ficticio.pdf"
boa="$fx/boa-ficticio.pdf"
perfil='testes/fixtures/perfil-com-plano-2026-2.json'
bash ferramentas/testar_paridade.sh "$hist"
bash ferramentas/testar_paridade.sh "$hist" "$boa"
bash ferramentas/testar_paridade.sh "$hist" "$perfil"
bash ferramentas/testar_paridade.sh "$hist" "$boa" "$perfil"
```

O script compara o perfil JS e o Python no mesmo texto e com extrações
independentes. Os casos acadêmicos CR-01 a CR-05 acompanham suas correções.
