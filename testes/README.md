# Testes da Grade ECI

A suíte tem 35 cenários de interface e cinco do kit de reimportação. Os casos A–D
testam a preservação de anotações e a igualdade entre baixar e aplicar. O caso P
ensaia a publicação com HTTP estático sob `/grade/`. Por `file://`, rodam 39
cenários. Por HTTP, rodam 40.

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
$gradeRef = 'bedab2a'
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
independentes. Os casos acadêmicos CR-01 a CR-04 acompanham suas correções.
