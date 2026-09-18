#!/bin/bash

# BaixaTube - Script de Inicialização Rápida no macOS
echo "================================================="
echo "   🚀 Iniciando BaixaTube Web Application..."
echo "================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/backend"

# Usar o Python 3 com suporte a yt-dlp e FastAPI já instalado no Mac
if [ -f "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3" ]; then
    PYTHON_CMD="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
else
    PYTHON_CMD="python3"
fi

echo "Usando interpretador: $PYTHON_CMD"

# Abrir o navegador automaticamente após 1 segundo
(sleep 1.5 && open "http://localhost:8000") &

echo "Abrindo BaixaTube em: http://localhost:8000"
echo "Pressione CTRL+C para encerrar o servidor."
echo "-------------------------------------------------"

exec "$PYTHON_CMD" -m uvicorn app:app --host 0.0.0.0 --port 8000
