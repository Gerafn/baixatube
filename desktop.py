import os
import sys
import time
import socket
import threading
from pathlib import Path

# Adicionar diretório base ao sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "backend"))

# Adicionar pasta bin local ao PATH (onde fica ffmpeg.exe no Windows)
bin_dir = BASE_DIR / "bin"
if bin_dir.exists():
    os.environ["PATH"] = f"{bin_dir}{os.pathsep}{os.environ.get('PATH', '')}"

import uvicorn

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def start_server(port):
    from app import app
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def main():
    port = find_free_port()
    
    # Iniciar servidor backend FastAPI em background
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()
    
    server_url = f"http://127.0.0.1:{port}"
    
    # Aguardar servidor responder
    time.sleep(1.2)
    
    try:
        import webview
        # Janela nativa moderna para Desktop (Windows / Mac)
        window = webview.create_window(
            title="BaixaTube PRO — Geraldo Falk v1.0",
            url=server_url,
            width=1040,
            height=780,
            min_size=(840, 620),
            background_color="#0a0b0e"
        )
        webview.start()
    except Exception as e:
        print(f"Modo Webview indisponível ({e}). Abrindo navegador padrão...")
        import webbrowser
        webbrowser.open(server_url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
