import os
import sys
import time
import uuid
import asyncio
import re
from pathlib import Path
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# Garantir acesso aos binários do FFmpeg e Node.js no macOS
os.environ["PATH"] = f"/opt/homebrew/bin:/usr/local/bin:/Library/Frameworks/Python.framework/Versions/3.13/bin:{os.environ.get('PATH', '')}"

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
import yt_dlp

app = FastAPI(title="BaixaTube API", version="1.0.0")

# Habilitar CORS para permitir requisições da Vercel ou localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diretório para arquivos temporários
BASE_DIR = Path(__file__).resolve().parent
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Armazenamento em memória do status de cada download
jobs: Dict[str, Dict[str, Any]] = {}
executor = ThreadPoolExecutor(max_workers=4)

class InfoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    type: str = "video"  # "video" ou "audio"
    quality: str = "720" # "1080", "720", "480", "360", "best", ou "320", "256", "192", "128"

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "Desconhecido"
    mins, secs = divmod(seconds, 60)
    hours, mins = divmod(mins, 60)
    if hours > 0:
        return f"{hours:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def cleanup_old_files():
    """Remove arquivos com mais de 1 hora."""
    try:
        now = time.time()
        for f in DOWNLOAD_DIR.glob("*"):
            if f.is_file() and now - f.stat().st_mtime > 3600:
                f.unlink(missing_ok=True)
    except Exception as e:
        print(f"Erro na limpeza: {e}")

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "BaixaTube API",
        "yt_dlp_version": getattr(yt_dlp, "__version__", "desconhecido")
    }

@app.post("/api/info")
def get_video_info(req: InfoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL não pode estar vazia.")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
            }
        },
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise HTTPException(status_code=404, detail="Não foi possível extrair os dados do vídeo.")
            
            # Formatos de vídeo disponíveis
            formats = info.get('formats', [])
            available_resolutions = set()
            for f in formats:
                h = f.get('height')
                vcodec = f.get('vcodec', 'none')
                if h and vcodec != 'none' and h in [360, 480, 720, 1080, 1440, 2160]:
                    available_resolutions.add(h)
            
            sorted_resolutions = sorted(list(available_resolutions), reverse=True)
            if not sorted_resolutions:
                sorted_resolutions = [720, 480, 360]
            
            return {
                "id": info.get("id"),
                "title": info.get("title", "Sem título"),
                "thumbnail": info.get("thumbnail"),
                "channel": info.get("uploader") or info.get("channel", "Canal desconhecido"),
                "duration": format_duration(info.get("duration")),
                "duration_seconds": info.get("duration", 0),
                "view_count": info.get("view_count"),
                "available_resolutions": sorted_resolutions,
                "audio_qualities": [
                    {"label": "320 kbps (Qualidade Máxima)", "value": "320"},
                    {"label": "256 kbps (Muito Alta)", "value": "256"},
                    {"label": "192 kbps (Recomendada)", "value": "192"},
                    {"label": "128 kbps (Padrão)", "value": "128"},
                ]
            }
    except Exception as e:
        err_msg = str(e)
        if "Sign in to confirm you’re not a bot" in err_msg:
            detail = "O YouTube bloqueou temporariamente este acesso automatizado. Tente novamente em instantes."
        else:
            detail = f"Erro ao obter informações do vídeo: {err_msg}"
        raise HTTPException(status_code=400, detail=detail)

def execute_download(job_id: str, url: str, is_audio: bool, quality: str):
    cleanup_old_files()
    job = jobs[job_id]
    job["status"] = "downloading"
    
    # Sanitizar ID para nome do arquivo
    output_template = str(DOWNLOAD_DIR / f"{job_id}_%(title)s.%(ext)s")
    
    def progress_hook(d):
        if d['status'] == 'downloading':
            total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            percent = 0.0
            if total_bytes > 0:
                percent = round((downloaded / total_bytes) * 100, 1)
            else:
                p_str = d.get('_percent_str', '0%').replace('%', '').strip()
                try:
                    percent = float(p_str)
                except ValueError:
                    percent = 0.0
            
            speed = d.get('_speed_str', '')
            eta = d.get('_eta_str', '')
            job["percent"] = min(percent, 99.0)
            job["speed"] = speed
            job["eta"] = eta
            job["downloaded_bytes"] = downloaded
            job["total_bytes"] = total_bytes
            
        elif d['status'] == 'finished':
            job["status"] = "processing"
            job["percent"] = 99.0
            job["speed"] = "Finalizando conversão..."
            job["eta"] = "Pronto em instantes"
            
    ydl_opts: Dict[str, Any] = {
        'outtmpl': output_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'web'],
            }
        },
        'retries': 5,
        'fragment_retries': 5,
    }
    
    if is_audio:
        # Download e conversão para MP3
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [
                {
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality if quality in ["128", "192", "256", "320"] else "192",
                },
                {
                    'key': 'FFmpegMetadata',
                    'add_metadata': True,
                }
            ],
        })
    else:
        # Download de Vídeo MP4
        if quality == "best":
            format_str = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
        else:
            format_str = f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
            
        ydl_opts.update({
            'format': format_str,
            'merge_output_format': 'mp4',
            'postprocessors': [
                {
                    'key': 'FFmpegVideoRemuxer',
                    'preferedformat': 'mp4',
                }
            ]
        })
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        # Localizar arquivo final gerado
        matching_files = list(DOWNLOAD_DIR.glob(f"{job_id}_*"))
        if not matching_files:
            raise RuntimeError("O arquivo baixado não foi encontrado no servidor.")
            
        final_file = matching_files[0]
        # Limpar o prefixo job_id para exibição limpa ao usuário
        display_name = final_file.name[len(job_id) + 1:]
        
        job["status"] = "finished"
        job["percent"] = 100.0
        job["speed"] = "Concluído!"
        job["eta"] = "00:00"
        job["filepath"] = str(final_file)
        job["filename"] = display_name
        job["filesize"] = final_file.stat().st_size
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
        print(f"Erro no download {job_id}: {e}")

@app.post("/api/download")
def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL inválida.")
        
    job_id = uuid.uuid4().hex
    is_audio = (req.type == "audio")
    
    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "percent": 0.0,
        "speed": "Iniciando...",
        "eta": "Calculando...",
        "filename": "",
        "filepath": "",
        "filesize": 0,
        "error": None,
        "created_at": time.time()
    }
    
    # Iniciar download em threadpool
    executor.submit(execute_download, job_id, url, is_audio, req.quality)
    
    return {"job_id": job_id}

@app.get("/api/progress/{job_id}")
async def get_progress_sse(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
        
    async def event_generator():
        while True:
            job = jobs.get(job_id)
            if not job:
                yield f"data: {{\"status\": \"error\", \"error\": \"Job cancelado\"}}\n\n"
                break
                
            data = {
                "status": job["status"],
                "percent": job["percent"],
                "speed": job["speed"],
                "eta": job["eta"],
                "filename": job["filename"],
                "filesize": job["filesize"],
                "error": job.get("error")
            }
            yield f"data: {json_dumps(data)}\n\n"
            
            if job["status"] in ["finished", "error"]:
                break
                
            await asyncio.sleep(0.5)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

def json_dumps(d):
    import json
    return json.dumps(d)

@app.get("/api/file/{job_id}")
def download_file(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download não encontrado.")
    if job.get("status") != "finished" or not job.get("filepath"):
        raise HTTPException(status_code=400, detail="Download ainda não foi finalizado.")
        
    filepath = Path(job["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Arquivo expirou ou foi removido.")
        
    return FileResponse(
        path=filepath,
        filename=job["filename"],
        media_type="application/octet-stream"
    )

# Servir arquivos estáticos do frontend (para execução local ou completa)
FRONTEND_DIR = BASE_DIR.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
