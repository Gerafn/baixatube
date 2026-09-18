# 🎬 BaixaTube

Aplicação Web moderna, elegante e de alta performance para baixar vídeos em **MP4 (1080p, 720p, 480p)** e músicas em **MP3 (320kbps, 256kbps, 192kbps)** do YouTube com controle total de qualidade e barra de progresso em tempo real.

---

## 🌟 Destaques do Projeto

- 🎥 **Vídeos em Alta Resolução**: Escolha entre 1080p Full HD, 720p HD, 480p ou 360p com vídeo e áudio combinados perfeitamente pelo FFmpeg.
- 🎵 **Músicas em MP3 de Estúdio**: Extração de áudio em até 320 kbps com metadados e capas preservadas.
- ⚡ **Barra de Progresso em Tempo Real**: Conexão Server-Sent Events (SSE) mostrando porcentagem, velocidade de download e tempo restante.
- 💎 **Design Premium Dark Glassmorphism**: Interface responsiva, moderna, com micro-animações, botões de ação rápida e suporte a dispositivos móveis.
- ☁️ **Pronto para a Nuvem**: Frontend otimizado para a **Vercel** e Backend preparado com Docker para **Render**, **Railway** ou execução local com 1 comando.

---

## 💻 Aplicativo Desktop & Instalador para Windows (.EXE)

Com a versão Desktop, você **não precisa de nenhuma hospedagem**! O aplicativo roda diretamente no Windows como um programa nativo com janela própria, atalho na Área de Trabalho e FFmpeg embutido.

### Opção A: Gerar o Instalador Automaticamente via GitHub (Sem precisar de PC Windows)
O repositório já inclui um fluxo de automação do **GitHub Actions**:
1. Acesse seu repositório: [https://github.com/Gerafn/baixatube](https://github.com/Gerafn/baixatube)
2. Vá na aba **Actions** ➔ **Gerar Instalador Windows**.
3. Clique em **Run workflow** (ou envie uma nova tag `v1.0.1`).
4. O GitHub utilizará uma máquina Windows na nuvem para compilar o executável e o arquivo **`Instalador_BaixaTube_v1.0.exe`** estará pronto para download direto!

### Opção B: Compilar em qualquer computador Windows (1 Duplo Clique)
1. Baixe a pasta do projeto no Windows.
2. Dê dois cliques no arquivo:
   👉 **`build_windows.bat`**
3. Ele baixará automaticamente o FFmpeg para Windows, instalará os pacotes e gerará a pasta `dist\BaixaTube\BaixaTube.exe` e o `Instalador_BaixaTube_v1.0.exe`.

---

## 🚀 Como Rodar Localmente no seu Mac (1 Clique)

Você pode rodar agora mesmo no seu computador sem precisar configurar nada:

1. Abra o terminal na pasta do projeto:
   ```bash
   cd /Users/geraldofalk/Documents/DEV2026/baixatube
   ```
2. Execute o script de inicialização:
   ```bash
   ./iniciar.sh
   ```
3. O aplicativo será iniciado e abrirá automaticamente no seu navegador padrão em:
   👉 **`http://localhost:8000`**

---

## ☁️ Como Publicar na Web (Vercel + Render/Railway)

Devido às políticas do YouTube e às limitações da Vercel (onde funções serverless cortam downloads que ultrapassam 4.5 MB e 10 segundos), a arquitetura profissional divide a aplicação em:
1. **Frontend na Vercel** (Interface ultrarrápida na CDN global)
2. **Backend no Render ou Railway** (Servidor Docker com FFmpeg sem limites de tamanho)

### Passo 1: Publicar o Backend no Render (Grátis)
1. Crie uma conta no [render.com](https://render.com).
2. Clique em **New +** -> **Web Service** e selecione o repositório do projeto no GitHub.
3. Escolha o ambiente **Docker**. O arquivo `backend/Dockerfile` e `render.yaml` já estão prontos.
4. Ao concluir, o Render gerará uma URL como:  
   `https://seu-baixatube-api.onrender.com`

### Passo 2: Publicar o Frontend na Vercel
1. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
2. Importe o repositório e configure a pasta raiz do projeto (**Root Directory**) como:  
   `frontend`
3. Clique em **Deploy**. A Vercel fornecerá o link:  
   `https://seu-baixatube.vercel.app`

### Passo 3: Conectar Frontend ao Backend
1. Abra o site na Vercel.
2. Clique no botão de status no topo direito (**Servidor Conectado / Engrenagem**).
3. Cole a URL da sua API do Render (ex: `https://seu-baixatube-api.onrender.com`) e clique em **Salvar Configuração**.
4. Pronto! O site na Vercel estará 100% conectado e pronto para baixar vídeos de qualquer lugar.

---

## 📂 Estrutura de Pastas

```
baixatube/
├── backend/
│   ├── app.py              # API FastAPI com yt-dlp, FFmpeg e SSE
│   ├── requirements.txt    # Dependências do backend
│   └── Dockerfile          # Container com FFmpeg para deploy
├── frontend/
│   ├── index.html          # Interface do usuário
│   ├── style.css           # Estilos e temas Glassmorphic
│   ├── app.js              # Lógica de preview, SSE e download
│   └── vercel.json         # Roteamento e cabeçalhos para a Vercel
├── render.yaml             # Configuração Blueprint para o Render
├── iniciar.sh              # Script de execução rápida para Mac
└── README.md
```
