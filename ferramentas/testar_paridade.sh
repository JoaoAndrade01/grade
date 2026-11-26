#!/usr/bin/env bash
# Confere se js/siga.js (navegador/Node) e gerar_perfil.py produzem o MESMO perfil.
# Uso: bash ferramentas/testar_paridade.sh [--atual] historico_anterior.pdf historico.pdf boa.pdf [perfil_anterior.js]
# "--atual" antes de um PDF de histórico marca o do curso atual nas três saídas (escolha explícita, PC-05).
# Compara as regras no mesmo texto e os perfis a partir de extrações independentes.
set -euo pipefail
cd "$(dirname "$0")/.."
python_cmd="${GRADE_PYTHON:-python3}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
args_py=(); args_js=(); args_pdf=(); n=0; marca_atual=0
for f in "$@"; do
  case "$f" in
    --atual) marca_atual=1;;
    *.js|*.json) args_py+=(--mesclar "$f"); args_js+=(--mesclar "$f"); args_pdf+=(--mesclar "$f");;
    *)
      n=$((n+1)); out="$TMP/$n.txt"
      "$python_cmd" -X utf8 -B -c "import runpy,sys; ler=runpy.run_path('ferramentas/gerar_perfil.py')['texto_pdf']; print(ler(sys.argv[1]))" "$f" > "$out"
      if grep -q "BOLETIM DE ORIENTA" "$out"; then tipo=--boa; else tipo=--historico; fi
      args_py+=($tipo "$out"); args_js+=($tipo "$out"); args_pdf+=(--pdf "$f")
      if [ "$marca_atual" = 1 ]; then
        [ "$tipo" = --historico ] || { echo "--atual vale só para históricos" >&2; exit 2; }
        args_py+=(--atual "$out"); args_js+=(--atual "$out"); args_pdf+=(--atual "$f"); marca_atual=0
      fi;;
  esac
done
"$python_cmd" -X utf8 ferramentas/gerar_perfil.py --texto --json --hoje 2000-01-01 "${args_py[@]}" > "$TMP/py.json"
node ferramentas/gerar_perfil_node.js --hoje 2000-01-01 "${args_js[@]}" > "$TMP/js.json"
node ferramentas/gerar_perfil_node.js --hoje 2000-01-01 "${args_pdf[@]}" > "$TMP/pdfjs.json"
"$python_cmd" -X utf8 - "$TMP/py.json" "$TMP/js.json" "$TMP/pdfjs.json" <<'PY'
import json,sys
a,b,c=(json.load(open(x, encoding="utf-8")) for x in sys.argv[1:])
if a != b:
    sys.exit("DIFERENÇA entre as regras JS e Python sobre o mesmo texto.")
if a != c:
    sys.exit("DIFERENÇA entre os perfis gerados com a extração de pypdf e pdf.js.")
print(f"OK: mesmas regras e mesmo perfil com extrações independentes ({len(a['periodos'])} períodos).")
PY
