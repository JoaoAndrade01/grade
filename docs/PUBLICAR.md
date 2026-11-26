# Publicar no GitHub Pages e manter o fork sincronizado

O app é estático: o GitHub Pages serve os arquivos como estão. Cada pessoa importa os **próprios** PDFs
no navegador; nada pessoal vai para o site (ver [PRIVACIDADE.md](PRIVACIDADE.md)).

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

Prepare e teste a versão em uma branch própria. Antes do commit, confira os arquivos alterados e adicione
apenas os que fazem parte da entrega.

```powershell
git status --short
git diff --cached --name-only
```

Se encontrar `perfil/perfil.js`, PDFs pessoais, planilhas, páginas salvas do SIGA ou saídas locais de IA
entre os arquivos preparados para o commit, pare e retire esses arquivos da entrega.
Confirme também o uso do logo e dos comentários do guia antes de uma publicação pública.

## 3. Integrar a versão revisada na `master`

Com o checkout limpo, informe o **hash completo do commit aprovado**, conforme registrado na revisão.
Mantenha a mesma janela do PowerShell para usar esse hash no passo 4.

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

Se o commit aprovado já estiver na ponta da `master`, siga para o passo 4. Se o merge falhar por divergência
ou a `master` já estiver além do hash aprovado, revise a integração e aprove o novo hash antes de publicar.

## 4. Conferir a versão e enviar para o fork

```powershell
git status --short --branch
git rev-parse --short master
git log --oneline origin/master..master
git log -m --format= --name-only origin/master..master
git -c core.quotePath=false ls-tree -r --name-only master | Select-String '(^|/)perfil/perfil\.js$|\.(pdf|xlsx?|ods)$'
```

Confira a árvore da `master` e os arquivos de todos os commits que serão enviados, inclusive os que foram
adicionados e removidos em commits posteriores. A busca com `Select-String` deve ficar vazia.
Se ela listar algum arquivo ou se houver dados pessoais no histórico a enviar, pare e revise a entrega.

Antes do push, abra a cópia pública descrita em [Testar por HTTP](../README.md#testar-por-http), criada a
partir do commit aprovado. Confira:

- a Grade abre no modo clássico, com o seletor de modo e a engrenagem no topo
- em **F12 → Rede**, o app carrega os recursos do próprio site, sem buscar `perfil/perfil.js`
- **Configurações → Referências** abre os links certos
- **A ECI por trás da Grade** funciona sem perfil
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

## 5. Configurar o GitHub Pages e validar a publicação

Na primeira publicação, abra **Settings → Pages → Build and deployment**. Em **Source**, selecione
**Deploy from a branch**. Escolha **`master` / `(root)`** e clique em **Save**. Se o Pages já estiver
ativo, confira se essa é a origem configurada.

Em **Actions**, aguarde a publicação e confira se ela usou o commit enviado. Abra o endereço exibido em
**Pages** por HTTPS, em uma janela anônima. Para este fork, o endereço esperado é
[Grade ECI](https://joaoandrade01.github.io/grade/). No modo completo, confira também se o link
**arquitetura** do rodapé abre no site publicado.

## Mantendo sincronizado

| Situação | Comando |
|---|---|
| Publicar mudanças novas | Revise o commit, integre à `master` e siga os passos 4 e 5 |
| Trazer novidades do repositório original | Rode `git fetch upstream`, integre `upstream/master` em uma branch de revisão e siga os passos 2 a 5 |
| Propor as melhorias ao Grêmio | No GitHub do fork: **Contribute → Open pull request** para `gremio-eci/grade` |

## Observações

- A busca automática pelo perfil opcional `perfil/perfil.js` só ocorre ao abrir o app direto do disco (`file://`).
  No site publicado, use **Importar do SIGA → Ou carregar um perfil pronto** para escolher um arquivo.
- O site funciona igual por GitHub Pages e por `file://`: não há build nem dependência externa em tempo de execução.
- O `js/guia.js` traz comentários de alunos copiados do Notion; combine com quem mantém a página antes de publicar
  (o app funciona sem esse arquivo).
- GitHub Pages em repositório privado exige plano pago; para testes, deixe o fork público.
