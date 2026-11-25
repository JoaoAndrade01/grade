#!/usr/bin/env bash
# Confere se js/siga.js (navegador/Node) e gerar_perfil.py produzem o MESMO perfil.
# Uso: bash ferramentas/testar_paridade.sh historico_anterior.pdf historico.pdf boa.pdf [perfil_anterior.js]
# Extrai as linhas acadêmicas uma vez e fornece o mesmo texto às duas implementações.
set -euo pipefail
cd "$(dirname "$0")/.."
python_cmd="${GRADE_PYTHON:-python3}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
args_py=(); args_js=(); n=0
for f in "$@"; do
  case "$f" in
    *.js) args_py+=(--mesclar "$f"); args_js+=(--mesclar "$f");;
    *)
      n=$((n+1)); out="$TMP/$n.txt"
      "$python_cmd" -X utf8 -B -c "import runpy,sys; ler=runpy.run_path('ferramentas/gerar_perfil.py')['texto_pdf']; print(ler(sys.argv[1]))" "$f" > "$out"
      if grep -q "BOLETIM DE ORIENTA" "$out"; then tipo=--boa; else tipo=--historico; fi
      args_py+=($tipo "$out"); args_js+=($tipo "$out");;
  esac
done
"$python_cmd" -X utf8 ferramentas/gerar_perfil.py --texto --json --hoje 2000-01-01 "${args_py[@]}" > "$TMP/py.json"
node ferramentas/gerar_perfil_node.js --hoje 2000-01-01 "${args_js[@]}" > "$TMP/js.json"
"$python_cmd" -X utf8 - "$TMP/py.json" "$TMP/js.json" <<'PY'
import json,sys
a,b=(json.load(open(x)) for x in sys.argv[1:3])
if a==b: print("OK: Python e JavaScript geraram o mesmo perfil (%d períodos)." % len(a["periodos"])); sys.exit(0)
print("DIFERENÇA entre Python e JavaScript."); sys.exit(1)
PY
