// Captures transient frames only after explicit user consent. Never stores images.
export function createScreenObserver({ button, automatic, status, available, busy, onComment }) {
  let stream, video, timer, controller, previous, lastComment = '', epoch = 0, lastRequest = 0, failures = 0;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const signatureCanvas = document.createElement('canvas');
  signatureCanvas.width = 32; signatureCanvas.height = 18;
  const signatureContext = signatureCanvas.getContext('2d', { willReadFrequently: true });
  function stop() {
    epoch++; clearInterval(timer); controller?.abort(); controller = undefined;
    stream?.getTracks().forEach(track => track.stop());
    if (video) { video.pause(); video.srcObject = null; }
    stream = video = previous = undefined;
    canvas.width = canvas.height = 1;
    signatureContext.clearRect(0,0,32,18);
    automatic.checked = false;
    button.textContent = 'Observar tela';
    button.setAttribute('aria-pressed','false');
    status.textContent = 'Tela não compartilhada.';
  }
  function frame() {
    if (!stream || !video?.videoWidth || !video.videoHeight || video.readyState < 2) return;
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    context.drawImage(video,0,0,canvas.width,canvas.height);
    let image;
    for (const quality of [.7,.5,.3]) {
      image = canvas.toDataURL('image/jpeg',quality);
      if (image.length <= 250000) break;
    }
    canvas.width = canvas.height = 1;
    return image.length <= 250000 ? image : undefined;
  }
  async function tick() {
    if (!stream || !automatic.checked || !available() || busy() || controller || Date.now()-lastRequest < 120000) return;
    if (!video.videoWidth || video.readyState < 2) return;
    signatureContext.drawImage(video,0,0,32,18);
    const pixels = signatureContext.getImageData(0,0,32,18).data;
    const changed = !previous || pixels.reduce((sum,v,i) => sum + Math.abs(v-previous[i]),0)/pixels.length > 8;
    if (!changed) return;
    const image = frame();
    if (!image) return;
    previous = pixels;
    lastRequest = Date.now();
    const current = epoch;
    const active = new AbortController(); controller = active;
    status.textContent = 'Analisando a tela…';
    try {
      const response = await fetch('/api/observe', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image,lastComment}), signal:active.signal });
      if (!response.ok) throw new Error('Análise indisponível');
      const result = await response.json();
      if (current !== epoch || !automatic.checked || !stream) return;
      failures = 0;
      if (result.comment && result.comment !== lastComment && !busy()) {
        lastComment = result.comment;
        onComment(result.comment);
      }
      if (!result.comment) status.textContent = 'Observação ativa.';
    } catch {
      if (current !== epoch) return;
      if (++failures >= 3) automatic.checked = false;
      status.textContent = automatic.checked ? 'Análise temporariamente indisponível.' : 'Análise automática pausada após falhas.';
    } finally { if (controller === active) controller = undefined; }
  }
  button.onclick = async () => {
    if (stream) return stop();
    if (!navigator.mediaDevices?.getDisplayMedia) { status.textContent = 'Captura de tela indisponível neste dispositivo.'; return; }
    if (!confirm('Compartilhar a tela nesta sessão? Imagens podem conter dados privados. Não compartilhe senhas ou informações de outras pessoas.')) return;
    button.disabled = true;
    const current = ++epoch;
    try {
      const source = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:2},audio:false});
      if (current !== epoch) { source.getTracks().forEach(t=>t.stop()); return; }
      stream = source;
      source.getVideoTracks().forEach(t=>t.addEventListener('ended',stop,{once:true}));
      video = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
      await video.play();
      if (current !== epoch) return;
      button.textContent = 'Parar observação'; button.setAttribute('aria-pressed','true');
      status.textContent = 'Tela compartilhada. Análise automática desativada.';
      timer = setInterval(tick,15000);
    } catch { stop(); status.textContent = 'Captura não autorizada ou indisponível.'; }
    finally { button.disabled = false; }
  };
  automatic.onchange = () => {
    if (!automatic.checked) { controller?.abort(); epoch++; status.textContent = stream ? 'Análise automática pausada.' : 'Tela não compartilhada.'; return; }
    if (!stream || !available() || !confirm('Autorizar envio periódico de imagens da tela ao modelo OpenAI configurado? Isso consome créditos e pode expor dados visíveis ao provedor.')) { automatic.checked = false; return; }
    status.textContent = 'Observação automática ativa.'; void tick();
  };
  window.addEventListener('pagehide',stop);
  return { stop };
}
