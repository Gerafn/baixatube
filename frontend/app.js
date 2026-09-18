// BaixaTube - Frontend Logic
(function () {
  // Configurações e Estado
  const STORAGE_KEY = 'baixatube_backend_url';
  let currentApiBase = localStorage.getItem(STORAGE_KEY) || window.location.origin;
  
  let currentVideoData = null;
  let currentFormat = 'video'; // 'video' ou 'audio'
  let selectedQuality = '720';
  let eventSource = null;

  // Elementos do DOM
  const urlInput = document.getElementById('urlInput');
  const btnPaste = document.getElementById('btnPaste');
  const btnFetch = document.getElementById('btnFetch');
  const inputError = document.getElementById('inputError');

  const loaderCard = document.getElementById('loaderCard');
  const resultCard = document.getElementById('resultCard');
  const progressCard = document.getElementById('progressCard');

  const videoThumb = document.getElementById('videoThumb');
  const videoDuration = document.getElementById('videoDuration');
  const videoTitle = document.getElementById('videoTitle');
  const videoChannel = document.getElementById('videoChannel');
  const videoViews = document.getElementById('videoViews');

  const tabVideo = document.getElementById('tabVideo');
  const tabAudio = document.getElementById('tabAudio');
  const videoQualityGrid = document.getElementById('videoQualityGrid');
  const audioQualityGrid = document.getElementById('audioQualityGrid');
  const btnStartDownload = document.getElementById('btnStartDownload');
  const downloadBtnLabel = document.getElementById('downloadBtnLabel');

  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressStatusText = document.getElementById('progressStatusText');
  const progressSpinner = document.getElementById('progressSpinner');
  const statSpeed = document.getElementById('statSpeed');
  const statEta = document.getElementById('statEta');
  const statSize = document.getElementById('statSize');

  const downloadFinishedActions = document.getElementById('downloadFinishedActions');
  const btnSaveFile = document.getElementById('btnSaveFile');
  const btnNewDownload = document.getElementById('btnNewDownload');

  // Modal de Configuração de Backend
  const btnBackendConfig = document.getElementById('btnBackendConfig');
  const backendStatusText = document.getElementById('backendStatusText');
  const configModal = document.getElementById('configModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const inputBackendUrl = document.getElementById('inputBackendUrl');
  const btnSaveConfig = document.getElementById('btnSaveConfig');

  // Inicialização
  init();

  function init() {
    setupEventListeners();
    checkBackendHealth();
  }

  function getApiUrl(path) {
    let base = currentApiBase.trim().replace(/\/+$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = window.location.origin;
    }
    return `${base}${path}`;
  }

  // Verifica o status do backend
  async function checkBackendHealth() {
    const dot = document.querySelector('.status-dot');
    try {
      const res = await fetch(getApiUrl('/health'), { method: 'GET' });
      if (res.ok) {
        dot.classList.remove('offline');
        dot.classList.add('online');
        backendStatusText.textContent = 'Servidor Conectado';
      } else {
        throw new Error('Offline');
      }
    } catch (e) {
      dot.classList.remove('online');
      dot.classList.add('offline');
      backendStatusText.textContent = 'Servidor Desconectado';
    }
  }

  function setupEventListeners() {
    // Colar da área de transferência
    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          urlInput.value = text.trim();
          fetchVideoInfo();
        }
      } catch (err) {
        urlInput.focus();
      }
    });

    // Submissão por Enter ou Botão Buscar
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        fetchVideoInfo();
      }
    });
    btnFetch.addEventListener('click', fetchVideoInfo);

    // Alternar Abas (Vídeo vs Áudio)
    tabVideo.addEventListener('click', () => switchTab('video'));
    tabAudio.addEventListener('click', () => switchTab('audio'));

    // Botão Iniciar Download
    btnStartDownload.addEventListener('click', startDownloadProcess);

    // Botão Novo Download
    btnNewDownload.addEventListener('click', resetAll);

    // Modal Backend
    btnBackendConfig.addEventListener('click', () => {
      inputBackendUrl.value = localStorage.getItem(STORAGE_KEY) || '';
      configModal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
      configModal.classList.add('hidden');
    });

    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) configModal.classList.add('hidden');
    });

    btnSaveConfig.addEventListener('click', () => {
      const val = inputBackendUrl.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_KEY, val);
        currentApiBase = val;
      } else {
        localStorage.removeItem(STORAGE_KEY);
        currentApiBase = window.location.origin;
      }
      configModal.classList.add('hidden');
      checkBackendHealth();
    });
  }

  function showError(msg) {
    inputError.textContent = msg;
    inputError.classList.remove('hidden');
  }

  function hideError() {
    inputError.classList.add('hidden');
    inputError.textContent = '';
  }

  // Buscar Informações do Vídeo
  async function fetchVideoInfo() {
    hideError();
    const url = urlInput.value.trim();

    if (!url) {
      showError('Por favor, cole um link do YouTube.');
      urlInput.focus();
      return;
    }

    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      showError('Insira uma URL válida do YouTube (ex: https://www.youtube.com/watch?v=...)');
      return;
    }

    // Exibir Skeleton loader
    resultCard.classList.add('hidden');
    progressCard.classList.add('hidden');
    loaderCard.classList.remove('hidden');
    btnFetch.disabled = true;

    try {
      const res = await fetch(getApiUrl('/api/info'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Não foi possível carregar os dados do vídeo.');
      }

      currentVideoData = data;
      renderVideoDetails(data);
    } catch (err) {
      showError(err.message || 'Erro ao conectar com o servidor.');
    } finally {
      loaderCard.classList.add('hidden');
      btnFetch.disabled = false;
    }
  }

  // Renderizar detalhes do vídeo
  function renderVideoDetails(info) {
    videoThumb.src = info.thumbnail || '';
    videoDuration.textContent = info.duration || '00:00';
    videoTitle.textContent = info.title;
    
    videoChannel.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ${info.channel || 'YouTube'}
    `;

    if (info.view_count) {
      videoViews.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        ${Number(info.view_count).toLocaleString('pt-BR')} visualizações
      `;
      videoViews.classList.remove('hidden');
    } else {
      videoViews.classList.add('hidden');
    }

    // Montar Grid de Vídeo
    renderVideoQualities(info.available_resolutions || [1080, 720, 480, 360]);

    // Montar Grid de Áudio
    renderAudioQualities(info.audio_qualities);

    // Ativar aba padrão
    switchTab('video');

    resultCard.classList.remove('hidden');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderVideoQualities(resolutions) {
    videoQualityGrid.innerHTML = '';
    
    // Escolhe a maior qualidade disponível <= 1080 como inicial padrão
    let defaultRes = resolutions.find(r => r <= 1080) || resolutions[0] || '720';
    selectedQuality = String(defaultRes);

    resolutions.forEach(res => {
      const card = document.createElement('div');
      card.className = `quality-card ${String(res) === selectedQuality ? 'selected' : ''}`;
      card.dataset.quality = String(res);

      let labelTag = '';
      if (res >= 1080) labelTag = '<span class="tag-badge">Full HD</span>';
      else if (res >= 720) labelTag = '<span class="tag-badge">HD</span>';

      card.innerHTML = `
        ${labelTag}
        <div class="quality-card-content">
          <span class="quality-name">${res}p</span>
          <span class="quality-badge">Vídeo MP4</span>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#videoQualityGrid .quality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedQuality = card.dataset.quality;
        updateDownloadBtnLabel();
      });

      videoQualityGrid.appendChild(card);
    });
  }

  function renderAudioQualities(qualities) {
    audioQualityGrid.innerHTML = '';
    const list = qualities || [
      { label: "320 kbps (Qualidade Máxima)", value: "320" },
      { label: "256 kbps (Muito Alta)", value: "256" },
      { label: "192 kbps (Recomendada)", value: "192" },
      { label: "128 kbps (Padrão)", value: "128" },
    ];

    list.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = `quality-card ${idx === 0 ? 'selected' : ''}`;
      card.dataset.quality = q.value;

      let labelTag = '';
      if (q.value === '320') labelTag = '<span class="tag-badge">Studio</span>';
      else if (q.value === '192') labelTag = '<span class="tag-badge">Popular</span>';

      card.innerHTML = `
        ${labelTag}
        <div class="quality-card-content">
          <span class="quality-name">${q.value} kbps</span>
          <span class="quality-badge">Áudio MP3</span>
        </div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('#audioQualityGrid .quality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedQuality = card.dataset.quality;
        updateDownloadBtnLabel();
      });

      audioQualityGrid.appendChild(card);
    });
  }

  function switchTab(type) {
    currentFormat = type;
    if (type === 'video') {
      tabVideo.classList.add('active');
      tabAudio.classList.remove('active');
      videoQualityGrid.classList.remove('hidden');
      audioQualityGrid.classList.add('hidden');

      const sel = videoQualityGrid.querySelector('.quality-card.selected');
      selectedQuality = sel ? sel.dataset.quality : '720';
    } else {
      tabAudio.classList.add('active');
      tabVideo.classList.remove('active');
      audioQualityGrid.classList.remove('hidden');
      videoQualityGrid.classList.add('hidden');

      const sel = audioQualityGrid.querySelector('.quality-card.selected');
      selectedQuality = sel ? sel.dataset.quality : '320';
    }
    updateDownloadBtnLabel();
  }

  function updateDownloadBtnLabel() {
    if (currentFormat === 'video') {
      downloadBtnLabel.textContent = `Baixar Vídeo (${selectedQuality}p MP4)`;
    } else {
      downloadBtnLabel.textContent = `Baixar Música (${selectedQuality} kbps MP3)`;
    }
  }

  // Iniciar Processo de Download e SSE
  async function startDownloadProcess() {
    const url = urlInput.value.trim();
    if (!url) return;

    btnStartDownload.disabled = true;
    hideError();

    // Mostrar Card de Progresso
    progressCard.classList.remove('hidden');
    downloadFinishedActions.classList.add('hidden');
    progressSpinner.classList.remove('hidden');
    progressBarFill.style.width = '2%';
    progressBarFill.style.background = 'linear-gradient(90deg, #ff0033, #ff5277)';
    progressPercent.textContent = '0%';
    progressStatusText.textContent = 'Iniciando download no servidor...';
    statSpeed.textContent = 'Iniciando...';
    statEta.textContent = 'Calculando...';
    statSize.textContent = 'Processando...';

    progressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const res = await fetch(getApiUrl('/api/download'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: currentFormat,
          quality: selectedQuality
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao iniciar o download.');
      }

      const jobId = data.job_id;
      listenToProgress(jobId);
    } catch (err) {
      progressStatusText.textContent = 'Erro: ' + (err.message || 'Falha ao iniciar.');
      progressSpinner.classList.add('hidden');
      btnStartDownload.disabled = false;
    }
  }

  // Ouvinte Server-Sent Events (SSE)
  function listenToProgress(jobId) {
    if (eventSource) {
      eventSource.close();
    }

    const sseUrl = getApiUrl(`/api/progress/${jobId}`);
    eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleProgressUpdate(data, jobId);
      } catch (e) {
        console.error('Erro ao analisar mensagem SSE:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('Conexão SSE oscilou ou foi fechada:', err);
    };
  }

  function handleProgressUpdate(data, jobId) {
    const { status, percent, speed, eta, error, filename, filesize } = data;

    if (percent !== undefined) {
      const p = Math.max(2, Math.min(percent, 100));
      progressBarFill.style.width = `${p}%`;
      progressPercent.textContent = `${Math.round(p)}%`;
    }

    if (speed) statSpeed.textContent = speed;
    if (eta) statEta.textContent = eta;

    if (filesize) {
      const mb = (filesize / (1024 * 1024)).toFixed(1);
      statSize.textContent = `${mb} MB`;
    }

    if (status === 'downloading') {
      progressStatusText.textContent = 'Baixando fluxo do YouTube...';
    } else if (status === 'processing') {
      progressStatusText.textContent = 'Processando e convertendo no FFmpeg...';
      statSpeed.textContent = 'Convertendo...';
    } else if (status === 'finished') {
      onDownloadFinished(jobId, filename);
    } else if (status === 'error') {
      onDownloadError(error || 'Ocorreu um erro no processamento.');
    }
  }

  function onDownloadFinished(jobId, filename) {
    if (eventSource) eventSource.close();

    progressSpinner.classList.add('hidden');
    progressStatusText.textContent = '🎉 Download concluído com sucesso!';
    progressPercent.textContent = '100%';
    progressBarFill.style.width = '100%';
    progressBarFill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';

    const downloadFileUrl = getApiUrl(`/api/file/${jobId}`);
    btnSaveFile.href = downloadFileUrl;
    if (filename) {
      btnSaveFile.setAttribute('download', filename);
    }

    downloadFinishedActions.classList.remove('hidden');
    btnStartDownload.disabled = false;

    // Disparar o download diretamente para conveniência do usuário
    setTimeout(() => {
      btnSaveFile.click();
    }, 500);
  }

  function onDownloadError(errorMsg) {
    if (eventSource) eventSource.close();
    progressSpinner.classList.add('hidden');
    progressStatusText.textContent = '❌ Erro no download';
    progressBarFill.style.background = '#ef4444';
    showError(errorMsg);
    btnStartDownload.disabled = false;
  }

  function resetAll() {
    if (eventSource) eventSource.close();
    progressCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    urlInput.value = '';
    urlInput.focus();
    hideError();
  }
})();
