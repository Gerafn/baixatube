@echo off
echo ========================================================
echo    Compilador do BaixaTube PRO para Windows
echo    Criado para Geraldo Falk - Versao 1.0
echo ========================================================
echo.

cd /d %~dp0

:: 1. Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado! Instale o Python 3.10 ou superior e marque "Add to PATH".
    pause
    exit /b 1
)

:: 2. Instalar dependencias
echo [*] Instalando dependencias necessarias...
pip install -r requirements-windows.txt

:: 3. Baixar FFmpeg para Windows se nao existir
if not exist "bin\ffmpeg.exe" (
    echo [*] FFmpeg nao encontrado em bin\. Baixando FFmpeg portatil para Windows...
    if not exist "bin" mkdir bin
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'bin\ffmpeg.zip'"
    echo [*] Extraindo ffmpeg.exe...
    powershell -Command "Expand-Archive -Path 'bin\ffmpeg.zip' -DestinationPath 'bin\temp' -Force; Move-Item 'bin\temp\*\bin\ffmpeg.exe' 'bin\ffmpeg.exe'; Remove-Item 'bin\temp' -Recurse -Force; Remove-Item 'bin\ffmpeg.zip' -Force"
)

:: 4. Compilar executavel com PyInstaller
echo [*] Compilando executavel do BaixaTube...
pyinstaller --noconsole --onedir --name "BaixaTube" ^
    --add-data "frontend;frontend" ^
    --add-data "backend;backend" ^
    --add-data "bin;bin" ^
    desktop.py --clean -y

echo.
echo ========================================================
echo   [SUCESSO] Aplicativo compilado com sucesso!
echo   Pasta do executavel: dist\BaixaTube\BaixaTube.exe
echo ========================================================
echo.

:: 5. Se o Inno Setup estiver instalado, gera o Instalador .exe automatico
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" (
    echo [*] Inno Setup detectado! Gerando instalador wizard (.exe)...
    "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" installer.iss
    echo [SUCESSO] Instalador criado na pasta Output\Instalador_BaixaTube_v1.0.exe!
) else (
    echo Dica: Se instalar o Inno Setup (gratis), este script gera o arquivo
    echo Instalador_BaixaTube_v1.0.exe com assistente de instalacao e atalho na area de trabalho.
)

pause
