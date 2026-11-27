# Publicar no GitHub Pages e manter o fork sincronizado

**Pergunta que este documento responde:** como publicar uma versão aprovada, passo a passo, e como confirmar que o que
está no ar é o que foi verificado.

O app é estático: o GitHub Pages serve os arquivos como estão. Cada pessoa importa os **próprios** PDFs no navegador;
nada pessoal vai para o site ([PRIVACIDADE.md](PRIVACIDADE.md)). O que verificar antes de publicar está na
[lista de verificação de versão](PLANO-DE-TESTE.md#7-lista-de-verificação-de-versão) e as condições de publicação em
[VISAO.md](VISAO.md#condições-para-publicar). Se algo der errado depois, use o
[plano de reversão](MANUTENCAO.md#plano-de-reversão).

Exemplo com o fork `https://github.com/JoaoAndrade01/grade` e a branch `master`.
Rode os comandos no **PowerShell**, dentro da pasta do projeto (`C:\dev\gradeECI\grade`).

## 1. Conferir os remotes

```powershell
git remote -v
```

Se `origin` já aponta para `JoaoAndrade01/grade` e `upstream` para `gremio-eci/grade`, vá para o passo 2.
Se você clonou o fork e só tem `origin`, acrescente o repositório original:

```powershell
git remote add upstream https://github.com/gremio-eci/grade.git
```

Se você clonou o original, `origin` aponta para `gremio-eci/grade` e ainda não existe `upstream`:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/JoaoAndrade01/grade.git
```

Confira com `git remote -v` se o destino de **push** de `origin` é o seu fork.

## 2. Revisar os arquivos e o commit candidato

Prepare e teste a versão em uma branch própria. Antes do commit, confira os arquivos alterados e adicione apenas os que
fazem parte da entrega.

```powershell
git status --short
git diff --cached --name-only
```

Se encontrar `perfil/perfil.js`, PDFs pessoais, planilhas, páginas salvas do SIGA ou saídas locais de IA entre os
arquivos preparados para o commit, pare e retire esses arquivos da entrega.

Rode a **[lista de verificação de versão](PLANO-DE-TESTE.md#7-lista-de-verificação-de-versão)** sobre o commit
candidato e anote o **hash completo** (40 caracteres). A aprovação vale para esse hash: qualquer mudança gera outro.

## 3. Integrar a versão aprovada na `master`

Com o checkout limpo, informe o **hash completo do commit aprovado**, conforme registrado na revisão. Mantenha a mesma
janela do PowerShell para usar esse hash nos passos seguintes.

```powershell
$shaAprovado = Read-Host 'Hash completo do commit aprovado'
if ($shaAprovado -notmatch '^[0-9a-f]{40}$') { throw 'Informe o hash completo do commit.' }
if (git status --porcelain) { throw 'Finalize as alterações locais antes de integrar.' }
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Não consegui atualizar origin.' }
git merge-base --is-ancestor origin/master $shaAprovado
if ($LASTEXITCODE -ne 0) { throw 'O commit aprovado precisa incluir a master do fork.' }
git switch master
if ($LASTEXITCODE -ne 0) { throw 'Não consegui abrir a master local.' }
git merge --ff-only $shaAprovado
```

Se o commit aprovado já estiver na ponta da `master`, siga para o passo 4. Se o merge falhar por divergência ou a
`master` já estiver além do hash aprovado, revise a integração e aprove o novo hash antes de publicar.

## 4. Conferir a versão e enviar para o fork

```powershell
git status --short --branch
git rev-parse master
git log --oneline origin/master..master
git log -m --format= --name-only origin/master..master
git -c core.quotePath=false ls-tree -r --name-only master | Select-String '(^|/)perfil/perfil\.js$|\.(pdf|xlsx?|ods)$'
```

Confira a árvore da `master` e os arquivos de todos os commits que serão enviados, inclusive os que foram adicionados e
removidos em commits posteriores. A busca com `Select-String` deve ficar vazia. Se ela listar algum arquivo ou se
houver dados pessoais no histórico a enviar, pare e revise a entrega.

Antes do push, abra a [cópia pública por HTTP](#abrir-a-cópia-pública-por-http), criada a partir do commit aprovado.
Confira:

- a Grade abre no modo Clássico, com o seletor "Clássico | Planejador" e a engrenagem no topo e o aviso no rodapé;
- o rodapé mostra `v2.0.0` e a data de conferência do currículo;
- em **F12 → Rede**, o app carrega os recursos do próprio site, sem buscar `perfil/perfil.js` e sem erro 404;
- **Configurações → Referências** abre os links certos;
- **A ECI por trás da Grade** funciona sem perfil;
- com PDFs fictícios, a prévia do SIGA abre e permite aplicar e baixar o perfil.

Com as verificações concluídas e o checkout limpo, confirme novamente o hash e envie a `master` para o fork:

```powershell
if (-not $shaAprovado -or (git rev-parse --verify master) -ne $shaAprovado -or $LASTEXITCODE -ne 0 -or
    (git status --porcelain) -or $LASTEXITCODE -ne 0) {
    throw 'Publicação bloqueada: confira o hash aprovado e o estado do checkout.'
} else {
    git push -u origin master
}
```

## 5. Conferir as Issues e os links de relato

O modelo de Issue ([`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/)) só vale depois de chegar à branch padrão
do fork, o que acontece com o push acima.

1. No fork, em **Settings → General → Features**, confirme que **Issues** está ativado.
2. Abra o link **Achou um erro? Crie uma nova issue** do **rodapé** da Grade publicada, nos modos Clássico e Planejador.
   Ele deve levar à criação de Issue **do fork**, sem dados da pessoa na URL. Se o GitHub mostrar a lista de modelos,
   escolha **Relatar um erro**. O formulário deve pedir o esperado, o observado, os passos e o navegador, e avisar para
   não anexar PDFs, perfil, nomes, matrículas nem capturas identificáveis.
3. Com um PDF fictício inválido, force o erro de importação e abra o **mesmo link** pela mensagem de erro. Deve chegar
   ao mesmo formulário.
4. Confirme que o link **GitHub** do rodapé leva ao fork e que o crédito "Baseado na Grade do Grêmio ECI" leva ao
   repositório do Grêmio.

## 6. Configurar o GitHub Pages e validar a publicação no mesmo hash

Na primeira publicação, abra **Settings → Pages → Build and deployment**. Em **Source**, selecione
**Deploy from a branch**. Escolha **`master` / `(root)`** e clique em **Save**. Se o Pages já estiver ativo, confirme
que essa é a origem configurada.

1. **Mesmo hash.** Em **Actions**, aguarde a publicação (*pages build and deployment*) e confirme que ela usou o commit
   enviado, o mesmo `$shaAprovado`. Com o GitHub CLI, `gh api repos/JoaoAndrade01/grade/pages/builds/latest --jq .commit`
   mostra o commit da última publicação.
2. **HTTPS.** Abra o endereço exibido em **Pages** por HTTPS, em janela anônima. Para este fork, o endereço esperado é
   [Grade ECI](https://joaoandrade01.github.io/grade/). Confirme que **Enforce HTTPS** está marcado.
3. **CSP e recursos.** Com **F12 → Rede**, recarregue: nenhuma requisição para outro domínio, nenhum 404 e nenhum aviso de
   política de segurança no console. Confira a presença do `<meta http-equiv="Content-Security-Policy">` na origem da
   página.
4. **Página substituta.** Abra `/classico.html` no site publicado: ela deve avisar que a versão antiga saiu, não carregar
   script, e levar ao modo clássico do app.
5. **Rodapé.** No Planejador, confira se o link **arquitetura** do rodapé abre no site publicado e se a versão e a data
   do currículo estão corretas.
6. **Tag do legado.** Confirme que a tag `legado-classico` existe no fork e aponta para um commit em que a página antiga
   abre.

## 7. Tag e release

Com a publicação conferida, registre a versão: uma **tag anotada** `v2.0.0` no hash aprovado e uma **release** no
GitHub com as notas de [MUDANCAS.md](MUDANCAS.md#v200--primeira-versão-pública).

```powershell
git tag -a v2.0.0 $shaAprovado -m "Grade ECI v2.0.0"
git push origin v2.0.0
```

Em **Releases → Draft a new release**, escolha a tag `v2.0.0`, dê o título "Grade ECI v2.0.0" e cole as notas da seção
"v2.0.0" de `docs/MUDANCAS.md` (do texto "O que mudou" até "Limitações conhecidas"). Com o GitHub CLI, salve as notas em
um arquivo temporário e use `gh release create v2.0.0 --title "Grade ECI v2.0.0" --notes-file <arquivo>`. Remova o
arquivo temporário depois.

## 8. Se algo der errado

Vá direto ao [plano de reversão](MANUTENCAO.md#plano-de-reversão): gatilhos, quem age, o último hash validado, como
corrigir por commit e como suspender a publicação.

## Mantendo sincronizado

| Situação | Comando |
| --- | --- |
| Publicar mudanças novas | Revise o commit, rode a lista de verificação, integre à `master` e siga os passos 4 a 7 |
| Trazer novidades do repositório original | Rode `git fetch upstream`, integre `upstream/master` em uma branch de revisão e siga os passos 2 a 7 |
| Propor as melhorias ao Grêmio | No GitHub do fork: **Contribute → Open pull request** para `gremio-eci/grade` |

## Abrir a cópia pública por HTTP

Sirva **uma cópia dos arquivos públicos**, acessível só neste computador. Assim o servidor não expõe `perfil/perfil.js`
nem os PDFs.

```powershell
$gradePublica = Join-Path $env:TEMP ("grade-eci-" + [guid]::NewGuid())
git archive --format=zip --output "$gradePublica.zip" HEAD index.html classico.html js static docs perfil/perfil.exemplo.js
Expand-Archive -LiteralPath "$gradePublica.zip" -DestinationPath $gradePublica
python -m http.server --bind 127.0.0.1 --directory "$gradePublica" 8000
```

Abra `http://127.0.0.1:8000` e use PDFs fictícios ou os seus pelo botão de importação. Ao terminar, pare o servidor com
Ctrl+C e remova a cópia:

```powershell
$gradePasta = Resolve-Path -LiteralPath $gradePublica
if ((Split-Path -Parent $gradePasta.Path) -eq (Resolve-Path -LiteralPath $env:TEMP).Path) {
  Remove-Item -LiteralPath $gradePasta.Path -Recurse -Force
  Remove-Item -LiteralPath "$gradePublica.zip"
}
```

`git archive` usa o último commit (`HEAD`). Para testar o commit aprovado, rode o comando com ele no lugar de `HEAD`. Para
testar mudanças ainda não commitadas, copie os mesmos arquivos da pasta de trabalho. O kit de testes faz uma cópia pública
própria ([testes/README.md](../testes/README.md)).

## Observações

- A busca automática pelo perfil opcional `perfil/perfil.js` só ocorre ao abrir o app direto do disco (`file://`). No
  site publicado, use **Importar do SIGA → Ou carregar um perfil pronto** para escolher um arquivo.
- O site funciona igual por GitHub Pages e por `file://`: não há build nem dependência externa em tempo de execução.
- GitHub Pages em repositório privado exige plano pago; para testes, deixe o fork público.
