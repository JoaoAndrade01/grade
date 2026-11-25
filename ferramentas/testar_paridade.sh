#!/usr/bin/env bash
# Confere se js/siga.js (navegador/Node) e gerar_perfil.py produzem o MESMO perfil.
# Uso: bash ferramentas/testar_paridade.sh historico_anterior.pdf historico.pdf boa.pdf [perfil_anterior.js]
# Os PDFs são lidos uma vez (pypdf, modo layout) e o mesmo texto alimenta as duas implementações.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
args_py=(); args_js=(); n=0
for f in "$@"; do
  case "$f" in
    *.js) args_py+=(--mesclar "$f"); args_js+=(--mesclar "$f");;
    *)
      n=$((n+1)); out="$TMP/$n.txt"
      python3 -c "import sys;from pypdf import PdfReader;print('\n'.join(p.extract_text(extraction_mode='layout') for p in PdfReader(sys.argv[1]).pages))" "$f" > "$out"
      if grep -q "BOLETIM DE ORIENTA" "$out"; then tipo=--boa; else tipo=--historico; fi
      args_py+=($tipo "$out"); args_js+=($tipo "$out");;
  esac
done
python3 ferramentas/gerar_perfil.py --texto --json --hoje 2000-01-01 "${args_py[@]}" > "$TMP/py.json"
node ferramentas/gerar_perfil_node.js --hoje 2000-01-01 "${args_js[@]}" > "$TMP/js.json"
python3 - "$TMP/py.json" "$TMP/js.json" <<'PY'
import json,sys
a,b=(json.load(open(x)) for x in sys.argv[1:3])
if a==b: print("OK: Python e JavaScript geraram o mesmo perfil (%d períodos)." % len(a["periodos"])); sys.exit(0)
print("DIFERENÇA entre Python e JavaScript:"); print(json.dumps(a,ensure_ascii=False)[:2000]); print(json.dumps(b,ensure_ascii=False)[:2000]); sys.exit(1)
PY
