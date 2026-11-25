import { decideInitiative } from './initiative.js';
import { createHearing } from './hearing.js';
import { createScreenObserver } from './screen-observer.js';
import { splitSpeech } from './voice.js';
import { moveMouth, setAvatarState, setVoiceLevel } from './avatar.js';
import { library } from './library.js';

const byId = id => document.getElementById(id);
const history = byId('history');
const message = byId('message');
const status = byId('chat-status');
const fileInput = byId('file');
const codexMode = byId('codex-mode');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let attachment = null;
let attachmentVersion = 0;
let pending = false;
let reference;
let cameraStream;
let cameraFrame;
const camera = byId('camera');
const preview = byId('camera-preview');
const frameButton = byId('camera-frame');
const voiceMode = byId('voice-mode');
voiceMode.disabled = !window.speechSynthesis;
let supportsVision = false;
let supportsCameraAnalysis = false;
let ownerName = 'Gabriel';
let modelConfigured;
let modelSetupError;
let remoteCodex = false;
let expressiveVoice = false;
let hearingAvailable = false;
let playback;
let nextSpokenTurn = false;
let stopVoiceSession = () => {};
let continueVoiceSession;

function setPresence(state, label) {
  setAvatarState(state);
  byId('presence-status').textContent = label;
}

const greet = byId('greet-max');
greet.disabled = !window.speechSynthesis;
greet.onclick = () => speak('Oi, ' + ownerName + '. Que bom te ver! Como você tá?', greet, 'Ouvir saudação');

function stopCamera() {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = undefined;
  cameraFrame = undefined;
  preview.srcObject = null;
  preview.hidden = true;
  frameButton.hidden = true;
  frameButton.textContent = 'Compartilhar foto';
  camera.textContent = 'Ligar câmera';
  camera.setAttribute('aria-pressed', 'false');
}

camera.onclick = async () => {
  if (cameraStream) return stopCamera();
  camera.disabled = true;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    cameraStream.getVideoTracks().forEach(track => track.addEventListener('ended', stopCamera));
    preview.srcObject = cameraStream;
    preview.hidden = false;
    frameButton.hidden = !supportsCameraAnalysis;
    camera.textContent = 'Desligar câmera';
    camera.setAttribute('aria-pressed', 'true');
  } catch {
    status.textContent = 'Não consegui ligar a câmera. Confira o acesso nas configurações do navegador.';
  } finally {
    camera.disabled = false;
  }
};

frameButton.onclick = () => {
  if (pending) return;
  if (cameraFrame) {
    cameraFrame = undefined;
    frameButton.textContent = 'Compartilhar foto';
    return;
  }
  if (!preview.videoWidth) {
    status.textContent = 'Aguarde a prévia da câmera.';
    return;
  }
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 640 / Math.max(preview.videoWidth, preview.videoHeight));
  canvas.width = Math.round(preview.videoWidth * scale);
  canvas.height = Math.round(preview.videoHeight * scale);
  canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
  const frame = canvas.toDataURL('image/jpeg', 0.6);
  if (frame.length > 130_000) {
    status.textContent = 'A foto ficou grande demais. Tente novamente.';
    return;
  }
  cameraFrame = frame;
  frameButton.textContent = 'Remover foto';
  if (!message.value.trim()) message.value = 'O que você vê nesta foto?';
  message.focus();
};
window.addEventListener('pagehide', stopCamera);

function read(name, defaultValue) {
  try {
    return JSON.parse(localStorage.getItem('max.' + name)) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

function save(name, value, feedback) {
  try {
    localStorage.setItem('max.' + name, JSON.stringify(value));
    return true;
  } catch {
    feedback.textContent = 'O navegador não conseguiu salvar os dados.';
    return false;
  }
}

let messages = read('conversation', []);
let memory = read('memory', '');
let tasks = read('tasks', []);
if (!Array.isArray(messages)) messages = [];
messages = messages.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-100);
if (typeof memory !== 'string') memory = '';
if (!Array.isArray(tasks)) tasks = [];
tasks = tasks.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string');
byId('memory-text').value = memory;
let memoryRevision = null;
let memoryBusy = false;
let memoryReady = false;
async function persistMemory(next) {
  const response = await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memory: next, revision: memoryRevision }) });
  const result = await response.json();
  if (response.status === 409) {
    memoryRevision = result.revision;
    memory = result.memory;
    byId('memory-text').value = memory;
    throw new Error('A memória mudou em outra aba. Confira a versão atual e tente novamente.');
  }
  if (!response.ok) throw new Error(result.error || 'Falha ao salvar memória.');
  memoryRevision = result.revision;
  memory = result.memory;
  byId('memory-text').value = memory;
  try { localStorage.removeItem('max.memory'); } catch {}
}
async function initializeMemory() {
  const feedback = byId('memory-status');
  try {
    const response = await fetch('/api/memory');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    memoryRevision = result.revision;
    if (memoryRevision === null && memory.trim()) await persistMemory(memory);
    else {
      memory = result.memory;
      byId('memory-text').value = memory;
      try { localStorage.removeItem('max.memory'); } catch {}
    }
    memoryReady = true;
    feedback.textContent = 'Memória local disponível.';
  } catch (error) {
    feedback.textContent = 'Memória local indisponível: ' + error.message + ' Recarregue a página para tentar novamente.';
  }
}
const memoryInitialization = initializeMemory();
let lastScreenCommentAt = 0;
let lastHumanSpeechAt = Date.now();
let lastInteractionAt = Date.now();
let lastInitiativeAt = Date.now();
let lastInitiativeComment = '';
let unansweredInitiatives = 0;
let initiativeRequest;
const initiativeToggle = byId('initiative-enabled');
const initiativeStatus = byId('initiative-status');
function noteInteraction() {
  lastInteractionAt = Date.now();
  unansweredInitiatives = 0;
  initiativeRequest?.abort();
}
for (const event of ['pointerdown','keydown']) document.addEventListener(event,noteInteraction,{passive:true});
initiativeToggle.onchange = () => {
  if (initiativeToggle.checked && !confirm('Permitir conversas espontâneas? A Max poderá usar trechos recentes da conversa com o modelo OpenAI para iniciar um assunto.')) initiativeToggle.checked = false;
  lastInitiativeAt = Date.now();
  unansweredInitiatives = 0;
  if (!initiativeToggle.checked) initiativeRequest?.abort();
  initiativeStatus.textContent = initiativeToggle.checked ? 'Iniciativa ativa.' : 'Iniciativa desativada.';
};
async function tickInitiative() {
  if (!supportsVision || !syncReady || initiativeRequest || document.hidden || !voiceMode.checked) return;
  const now = Date.now();
  const kind = decideInitiative({enabled:initiativeToggle.checked,quiet:!voiceMode.checked,speaking:Boolean(playback),userSpeaking:now-lastHumanSpeechAt<15000,busy:pending||syncBusy||Boolean(message.value.trim()),lastSpeechAt:Math.max(lastHumanSpeechAt,lastInitiativeAt,lastScreenCommentAt),lastActivityAt:lastInteractionAt,unanswered:unansweredInitiatives,screenConsent:false},now);
  if (!kind) return;
  const controller = new AbortController(); initiativeRequest = controller;
  lastInitiativeAt = now;
  try {
    const response = await fetch('/api/initiative',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,previous:lastInitiativeComment}),signal:controller.signal});
    if (!response.ok) throw Error('Iniciativa indisponível');
    const result = await response.json();
    if (controller.signal.aborted || !initiativeToggle.checked || !voiceMode.checked || pending || playback || document.hidden || !result.comment) return;
    lastInitiativeComment = result.comment;
    unansweredInitiatives++;
    initiativeStatus.textContent = 'Max: ' + result.comment;
    void speak(result.comment);
  } catch { if (!controller.signal.aborted) initiativeStatus.textContent = 'Iniciativa temporariamente indisponível.'; }
  finally { if (initiativeRequest === controller) initiativeRequest = undefined; }
}
setInterval(tickInitiative,30000);
window.addEventListener('pagehide',()=>initiativeRequest?.abort());
const screenObserver = createScreenObserver({
  button: byId('screen-observe'),
  automatic: byId('screen-auto'),
  status: byId('screen-status'),
  available: () => supportsVision,
  busy: () => pending || Boolean(initiativeRequest) || Boolean(playback) || Boolean(message.value.trim()) || Date.now() - lastScreenCommentAt < 180000 || Date.now() - lastHumanSpeechAt < 15000,
  onComment: comment => {
    lastScreenCommentAt = Date.now();
    byId('screen-status').textContent = 'Max: ' + comment;
    if (voiceMode.checked) void speak(comment);
  }
});
const revisions = { conversation: null, tasks: null };
let syncBusy = false;
let syncReady = false;
function applyState(kind, result) {
  revisions[kind] = result.revision;
  if (kind === 'conversation') { messages = result.items; renderConversation(); }
  else { tasks = result.items; renderTasks(); }
}
async function pullState(kind) {
  const response = await fetch('/api/state/' + kind);
  if (!response.ok) throw new Error('Não consegui acessar o Max Core.');
  return response.json();
}
async function pushState(kind, items) {
  const response = await fetch('/api/state/' + kind, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, revision: revisions[kind] })
  });
  const result = await response.json();
  if (response.status === 409) {
    applyState(kind, result);
    throw new Error('Outro dispositivo atualizou os dados. Confira a versão atual e tente novamente.');
  }
  if (!response.ok) throw new Error(result.error || 'Não consegui sincronizar.');
  applyState(kind, result);
}
async function initializeSync() {
  syncBusy = true;
  try {
    for (const kind of ['conversation', 'tasks']) {
      const result = await pullState(kind);
      const existing = kind === 'conversation' ? messages : tasks;
      if (result.revision === null && existing.length) {
        await pushState(kind, existing);
        try { localStorage.removeItem('max.' + kind); } catch {}
      } else {
        applyState(kind, result);
        // Preserve older local data if a different device initialized the server.
        if (!existing.length) try { localStorage.removeItem('max.' + kind); } catch {}
      }
    }
    syncReady = true;
  } catch (error) { status.textContent = error.message; }
  finally { syncBusy = false; }
}
async function refreshSync() {
  if (!syncReady || syncBusy || pending || memoryBusy || document.hidden) return;
  syncBusy = true;
  try {
    for (const kind of ['conversation', 'tasks']) {
      const result = await pullState(kind);
      if (result.revision !== revisions[kind]) applyState(kind, result);
    }
  } catch { /* keep displayed data; retry on next poll */ }
  finally { syncBusy = false; }
}


document.querySelectorAll('[data-panel]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-panel]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
      byId(item.dataset.panel).hidden = !selected;
    });
  };
});

fetch('/api/status').then(response => response.json()).then(({ configured, configurationError, owner, provider, providerName, codexAvailable, expressiveVoice: available, hearingAvailable: hearingConfigured }) => {
  ownerName = owner;
  modelConfigured = configured;
  modelSetupError = configurationError;
  remoteCodex = codexAvailable === true;
  expressiveVoice = available === true;
  hearingAvailable = hearingConfigured === true;
  codexMode.parentElement.lastChild.textContent = codexAvailable ? ' Codex · OpenAI' : ' Programação · ' + providerName;
  codexMode.parentElement.title = codexAvailable
    ? 'Envia a pergunta atual e o anexo escolhido ao Codex da OpenAI.'
    : 'Usa o modelo atual com instruções focadas em programação.';
  if (expressiveVoice) {
    greet.disabled = false;
    voiceMode.disabled = false;
  }
  supportsVision = configured && provider === 'openai';
  supportsCameraAnalysis = configured && ['openai','claude'].includes(provider);
  if (cameraStream) frameButton.hidden = !supportsCameraAnalysis;
  byId('greeting').textContent = 'Oi, ' + owner + '. Eu sou a Max.';
  byId('connection').textContent = configured ? 'Modelo · ' + providerName : providerName + ' · configuração pendente';
  if (provider !== 'openai') {
    byId('search').checked = false;
    byId('search').disabled = true;
    byId('search').parentElement.hidden = true;
    document.querySelector('[data-prompt=""]').hidden = true;
  }
}).catch(() => {
  byId('connection').textContent = 'Servidor indisponível';
});

async function connectLipSync(active) {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine || !active.audio) return;
  let context;
  try {
    context = new AudioEngine();
    active.audioContext = context;
    await context.resume();
    if (playback !== active) { await context.close().catch(() => {}); return; }
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const source = context.createMediaElementSource(active.audio);
    source.connect(analyser);
    analyser.connect(context.destination);
    const samples = new Float32Array(analyser.fftSize);
    const update = () => {
      if (playback !== active) return;
      analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      setVoiceLevel(active.audio.paused ? 0 : Math.min(1, Math.max(0, (rms - .012) * 7)));
      active.lipFrame = requestAnimationFrame(update);
    };
    update();
  } catch {
    if (playback === active) setVoiceLevel(null);
    if (context && context.state !== 'closed') await context.close().catch(() => {});
  }
}

function stopSpeaking() {
  const active = playback;
  if (!active) return;
  playback = undefined;
  active.controller.abort();
  clearTimeout(active.timeout);
  active.audio?.pause();
  cancelAnimationFrame(active.lipFrame);
  active.audioContext?.close().catch(() => {});
  setVoiceLevel(null);
  if (active.url) URL.revokeObjectURL(active.url);
  window.speechSynthesis?.cancel();
  if (active.button) active.button.textContent = active.label;
  setPresence('idle', 'Pronta para conversar');
}

function finishSpeaking(active) {
  if (playback !== active) return;
  stopSpeaking();
  active.onDone?.();
}

async function speak(text, button, label = 'Ouvir', onDone, style = 'natural') {
  const sameButton = button && playback?.button === button;
  stopSpeaking();
  if (sameButton) return;
  const spoken = text.replace(/`{3}[\s\S]*?`{3}/g, ' Veja o trecho de código na tela. ')
    .replace(/\[([^\]]+)\]\(https?:[^)]+\)/g, '$1').replace(/[*#`]/g, '')
    .replace(/[.…]{3,}/g, '.')
    .replace(/([^.!?:;])\s*\n\s*\n/g, '$1. ')
    .replace(/\s+/g, ' ').trim();
  if (!spoken) return;
  const active = { controller: new AbortController(), button, label, onDone };
  playback = active;
  if (button) button.textContent = 'Parar';

  if (expressiveVoice) {
    setPresence('thinking', 'Preparando a voz');
    try {
      const chunks = splitSpeech(spoken);
      const fetchChunk = async text => {
        const response = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, style }),
          signal: active.controller.signal,
        });
        if (!response.ok) throw new Error('Voz indisponível');
        return response.blob();
      };
      for (const chunk of chunks) {
        const blob = await fetchChunk(chunk);
        if (playback !== active) return;
        active.url = URL.createObjectURL(blob);
        active.audio = new Audio(active.url);
        const audio = active.audio;
        const ended = new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = () => reject(new Error('Falha de áudio'));
          active.controller.signal.addEventListener('abort', resolve, { once: true });
        });
        audio.onplaying = () => {
          if (playback === active) setPresence('speaking', 'Falando');
        };
        await audio.play();
        if (playback === active) void connectLipSync(active);
        await ended;
        if (playback !== active) return;
        cancelAnimationFrame(active.lipFrame);
        await active.audioContext?.close().catch(() => {});
        active.audioContext = undefined;
        URL.revokeObjectURL(active.url);
        active.url = undefined;
        setVoiceLevel(0);
      }
      finishSpeaking(active);
      return;
    } catch {
      if (playback !== active) return;
      status.textContent = 'A voz expressiva ficou indisponível. Usando a voz do dispositivo.';
      cancelAnimationFrame(active.lipFrame);
      active.audio?.pause();
      await active.audioContext?.close().catch(() => {});
      active.audioContext = undefined;
      if (active.url) URL.revokeObjectURL(active.url);
      active.url = undefined;
      setVoiceLevel(null);
      if (playback !== active) return;
    }
  }

  if (!window.speechSynthesis) {
    stopSpeaking();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(spoken);
  active.utterance = utterance;
  active.timeout = setTimeout(() => {
    if (playback === active) stopSpeaking();
  }, Math.max(10_000, spoken.length * 110));
  utterance.lang = 'pt-BR';
  utterance.rate = 1.0;
  utterance.pitch = 1.03;
  const voices = window.speechSynthesis.getVoices().filter(voice => /^pt[-_]BR$/i.test(voice.lang));
  utterance.voice = voices.find(voice => /(?:luciana|fernanda|francisca|maria).*(?:premium|enhanced|aprimorada)|neural|natural/i.test(voice.name))
    || voices.find(voice => /flo|sandy|shelley|fernanda|francisca/i.test(voice.name))
    || voices.find(voice => /luciana|maria|female/i.test(voice.name))
    || voices[0] || null;
  utterance.onstart = () => {
    if (playback === active) setPresence('speaking', 'Falando');
  };
  utterance.onboundary = () => { if (playback === active) moveMouth(); };
  utterance.onend = () => finishSpeaking(active);
  utterance.onerror = () => { if (playback === active) stopSpeaking(); };
  window.speechSynthesis.speak(utterance);
}

function renderConversation() {
  history.querySelectorAll('.turn').forEach(node => node.remove());
  byId('welcome').hidden = messages.length > 0;
  for (const entry of messages) {
    const article = document.createElement('article');
    article.className = 'turn ' + entry.role;
    const title = document.createElement('strong');
    title.textContent = entry.role === 'user' ? 'Você' : 'Max';
    const paragraph = document.createElement('p');
    paragraph.textContent = entry.content;
    article.append(title, paragraph);
    if (entry.file) {
      const filename = document.createElement('small');
      filename.textContent = 'Arquivo enviado: ' + entry.file;
      article.append(filename);
    }
    if (entry.sources?.length) {
      const list = document.createElement('ul');
      list.className = 'sources';
      list.setAttribute('aria-label', 'Fontes');
      for (const source of entry.sources) {
        if (!/^https?:\/\//i.test(source.url)) continue;
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = source.url;
        link.textContent = source.title;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        li.append(link);
        list.append(li);
      }
      article.append(list);
    }
    if (entry.role === 'assistant' && (window.speechSynthesis || expressiveVoice)) {
      const button = document.createElement('button');
      button.className = 'speak';
      button.textContent = 'Ouvir';
      button.onclick = () => speak(entry.content, button);
      article.append(button);
    }
    history.append(article);
  }
  history.scrollTop = history.scrollHeight;
}

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.onclick = () => {
    message.value = button.dataset.prompt;
    if (!message.value) byId('search').checked = true;
    if (button.hasAttribute('data-use-tasks')) byId('use-tasks').checked = true;
    message.focus();
  };
});

byId('new-chat').onclick = async () => {
  if (pending || syncBusy || !syncReady) return;
  if (messages.length && !window.confirm('Apagar a conversa atual e começar outra?')) return;
  syncBusy = true;
  try { await pushState('conversation', []); }
  catch (error) { status.textContent = error.message; return; }
  finally { syncBusy = false; }
  status.textContent = '';
  stopSpeaking();
  setPresence('idle', 'Pronta para conversar');
  clearAttachment();
  cameraFrame = undefined;
  frameButton.textContent = 'Compartilhar foto';
  setReference();
  byId('use-tasks').checked = false;
  codexMode.checked = false;
  message.value = '';
  renderConversation();
  message.focus();
};

function clearAttachment() {
  attachmentVersion++;
  attachment = null;
  fileInput.value = '';
  byId('remove-file').hidden = true;
}

byId('attach').onclick = () => fileInput.click();
byId('remove-file').onclick = clearAttachment;
fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;
  clearAttachment();
  status.textContent = '';
  if (file.size > 96_000) {
    status.textContent = 'Escolha um arquivo de texto de até 96 KB.';
    return;
  }
  const version = attachmentVersion;
  byId('send').disabled = true;
  try {
    const text = await file.text();
    if (version !== attachmentVersion) return;
    if (!text.trim() || text.includes('\0') || text.includes('�') || text.length > 24_000) {
      status.textContent = 'Escolha um arquivo de texto UTF-8 com até 24.000 caracteres.';
      return;
    }
    attachment = { name: file.name, text };
    byId('remove-file').textContent = 'Remover ' + file.name;
    byId('remove-file').hidden = false;
  } catch {
    status.textContent = 'Não consegui abrir esse arquivo.';
  } finally {
    if (!pending) byId('send').disabled = false;
  }
};

const mic = byId('mic');
const micFeedback = byId('mic-feedback');
const continuousVoice = byId('continuous-voice');
function showMicFeedback(text) {
  micFeedback.textContent = text;
  micFeedback.hidden = !text;
}

const hearing = createHearing({
  status: text => {
    showMicFeedback(text);
    mic.textContent = hearing.active() ? 'Desativar microfone' : 'Ativar microfone contínuo';
    mic.setAttribute('aria-pressed', String(hearing.active()));
  },
  playing: () => Boolean(playback),
  busy: () => pending,
  onSpeech: () => {
    lastHumanSpeechAt = Date.now();
    noteInteraction();
    if (playback) stopSpeaking();
  },
  onTranscript: heard => {
    lastHumanSpeechAt = Date.now();
    if (pending || syncBusy || !syncReady || message.value.trim() || byId('send').disabled) {
      showMicFeedback('Fala detectada enquanto a conversa estava ocupada.');
      return;
    }
    message.value = heard;
    if (voiceMode.checked) {
      nextSpokenTurn = true;
      byId('chat-form').requestSubmit();
    }
    if (!continuousVoice.checked) stopVoiceSession();
  }
});
stopVoiceSession = () => hearing.stop();
continueVoiceSession = () => {};
mic.onclick = async () => {
  if (hearing.active()) return stopVoiceSession();
  if (!hearingAvailable) return showMicFeedback('Configure OPENAI_API_KEY para transcrição de áudio.');
  if (!confirm('Ativar microfone contínuo? Trechos detectados como fala são enviados à OpenAI para transcrição. Não há gravação permanente no Max Core. Avise outras pessoas próximas e pause quando precisar de privacidade.')) return;
  await hearing.start();
  mic.textContent = hearing.active() ? 'Desativar microfone' : 'Ativar microfone contínuo';
  mic.setAttribute('aria-pressed', String(hearing.active()));
};
continuousVoice.onchange = () => { if (!continuousVoice.checked) stopVoiceSession(); };

byId('chat-form').onsubmit = async event => {
  event.preventDefault();
  noteInteraction();
  const spokenTurn = nextSpokenTurn;
  nextSpokenTurn = false;
  const content = message.value.trim();
  if (pending || byId('send').disabled || !content) return;

  await memoryInitialization;
  if (pending || memoryBusy || syncBusy || !syncReady) { status.textContent = 'Aguarde a sincronização com o Max Core.'; return; }
  const memoryRequest = content.match(/^lembre\s+que(?:\s+([\s\S]+))?$/i);
  if (memoryRequest) {
    const note = memoryRequest[1]?.trim();
    if (!note) {
      status.textContent = 'Escreva o que você quer guardar depois de “Lembre que”.';
      return;
    }
    const next = [memory, note].filter(Boolean).join('\n');
    if (next.length > 60000) {
      status.textContent = 'A memória atingiu o limite. Você pode liberar espaço na aba Memória.';
      return;
    }
    if (await saveMemory(next, status)) {
      message.value = '';
      status.textContent = 'Guardei essa lembrança. Você pode editá-la na aba Memória.';
      if (spokenTurn) speak('Tá bom, guardei.');
    }
    return;
  }

  if (!spokenTurn) showMicFeedback('');
  if (modelConfigured === false && !(remoteCodex && codexMode.checked)) {
    status.textContent = 'A Max precisa de um modelo para responder. ' + modelSetupError;
    return;
  }

  const user = { role: 'user', content, file: attachment?.name };
  pending = true;
  const controls = ['send', 'new-chat', 'attach', 'remove-file', 'message', 'search', 'use-tasks', 'codex-mode', 'remove-reference', 'camera-frame'].map(byId).filter(control => !control.disabled);
  controls.forEach(control => control.disabled = true);
  status.textContent = 'Max está preparando a resposta…';
  setPresence('thinking', 'Preparando a resposta');
  try {
    const recent = [...messages.slice(-14), user].map(entry => ({ role: entry.role, content: entry.content.slice(0, 10_000) }));
    const pendingTasks = byId('use-tasks').checked
      ? tasks.filter(task => !task.done).slice(0, 50).map(task => task.title)
      : undefined;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: recent, memory, file: attachment, search: byId('search').checked, pendingTasks, reference, image: cameraFrame, spokenTurn, coding: codexMode.checked }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const turn = { role: 'assistant', content: result.answer, sources: result.sources };
    const next = [...messages, user, turn].slice(-100);
    try { await pushState('conversation', next); }
    catch (error) {
      // Keep the unsaved answer visible without overwriting another device.
      status.textContent = 'Resposta não sincronizada: ' + error.message;
      const article = document.createElement('article');
      article.className = 'turn assistant';
      article.textContent = result.answer;
      history.append(article);
      return;
    }
    status.textContent = result.incomplete ? 'A resposta atingiu o limite de tamanho.' : '';
    window.dispatchEvent(new CustomEvent('max:user-message',{detail:content}));
    message.value = '';
    clearAttachment();
    cameraFrame = undefined;
    frameButton.textContent = 'Compartilhar foto';
    setReference();
    byId('use-tasks').checked = false;
    codexMode.checked = false;
    renderConversation();
    if (voiceMode.checked) speak(result.answer, undefined, undefined, spokenTurn ? continueVoiceSession : undefined);
  } catch (error) {
    status.textContent = error instanceof TypeError ? 'Não consegui conectar ao servidor da Max.' : error.message;
  } finally {
    pending = false;
    if (!playback) setPresence('idle', 'Pronta para conversar');
    controls.forEach(control => control.disabled = false);
    if (!byId('chat').hidden) message.focus();
  }
};

async function saveMemory(next, feedback) {
  await memoryInitialization;
  if (!memoryReady || memoryBusy) {
    feedback.textContent = 'Memória indisponível ou ocupada. Tente novamente.';
    return false;
  }
  memoryBusy = true;
  try { await persistMemory(next); return true; }
  catch (error) { feedback.textContent = error.message; return false; }
  finally { memoryBusy = false; }
}
byId('memory-form').onsubmit = async event => {
  event.preventDefault();
  const next = byId('memory-text').value.trim();
  if (next.length > 60000) {
    byId('memory-status').textContent = 'A memória deve ter até 60.000 caracteres.';
    return;
  }
  if (await saveMemory(next, byId('memory-status'))) {
    byId('memory-status').textContent = 'Memória salva no computador.';
  }
};
byId('memory-export').onclick = async () => {
  await memoryInitialization;
  if (!memoryReady) return;
  const url = URL.createObjectURL(new Blob([memory], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'max-memoria.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
byId('memory-clear').onclick = async () => {
  if (!window.confirm('Apagar todas as lembranças salvas da Max?')) return;
  if (await saveMemory('', byId('memory-status'))) byId('memory-status').textContent = 'Memória apagada.';
};

function renderTasks() {
  const list = byId('task-list');
  list.replaceChildren();
  if (!tasks.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Você ainda não tem tarefas.';
    list.append(empty);
  }
  for (const task of tasks) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.onchange = () => updateTasks(tasks.map(item => item.id === task.id ? { ...item, done: check.checked } : item));
    label.append(check, document.createTextNode(task.title));
    const remove = document.createElement('button');
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', 'Remover tarefa ' + task.title);
    remove.onclick = () => updateTasks(tasks.filter(item => item.id !== task.id));
    li.append(label, remove);
    list.append(li);
  }
}

async function updateTasks(next) {
  const feedback = byId('task-status');
  if (!syncReady || syncBusy || pending) { renderTasks(); feedback.textContent = 'Aguarde a sincronização.'; return false; }
  syncBusy = true;
  feedback.textContent = '';
  try { await pushState('tasks', next); return true; }
  catch (error) { feedback.textContent = error.message; renderTasks(); return false; }
  finally { syncBusy = false; }
}

byId('task-form').onsubmit = async event => {
  event.preventDefault();
  const field = byId('task-text');
  const title = field.value.trim();
  if (title && await updateTasks([...tasks, { title, done: false, id: crypto.randomUUID() }])) field.value = '';
};

renderConversation();
renderTasks();
void initializeSync();
setInterval(refreshSync, 5000);
document.addEventListener('visibilitychange', refreshSync);
window.addEventListener('online',()=>{if(syncReady)void refreshSync();else if(!syncBusy)void initializeSync();});
// Mobile browsers cannot guarantee background microphone capture.
document.addEventListener('visibilitychange',()=>{if(document.hidden && !window.maxDeveloper){stopVoiceSession();screenObserver.stop();}});

const removeReference = byId('remove-reference');
function setReference(project) {
  reference = project?.id;
  removeReference.hidden = !project;
  removeReference.textContent = project ? 'Remover referência: ' + project.title : '';
}
removeReference.onclick = () => setReference();

function renderLibrary() {
  const query = byId('library-filter').value.trim().toLocaleLowerCase('pt-BR');
  const list = byId('library-list');
  list.replaceChildren();
  for (const project of library) {
    const searchable = [project.title, project.description, project.id].join(' ').toLocaleLowerCase('pt-BR');
    if (!searchable.includes(query)) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = project.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = project.title;
    const description = document.createElement('p');
    description.textContent = project.description;
    const ask = document.createElement('button');
    ask.textContent = 'Perguntar à Max';
    ask.onclick = () => {
      if (pending) return;
      setReference(project);
      document.querySelector('[data-panel="chat"]').click();
      if (!message.value.trim()) message.value = 'Como ' + project.title + ' pode ajudar no meu projeto da Max?';
      message.focus();
    };
    item.append(link, description, ask);
    list.append(item);
  }
  if (!list.childElementCount) list.textContent = 'Nenhum projeto encontrado.';
}
byId('library-filter').oninput = renderLibrary;
renderLibrary();

if (window.maxDeveloper) {
  const dev=window.maxDeveloper, panel=byId('developer-panel'), feedback=byId('developer-status'), files=byId('developer-files'), review=byId('developer-review'), apply=byId('developer-apply');
  const choose=byId('developer-choose'), propose=byId('developer-propose'), revoke=byId('developer-revoke');
  const testFiles=byId('developer-tests'), runTests=byId('developer-run-tests'), testOutput=byId('developer-test-output');
  const codexButton=byId('developer-codex');
  let working=false, epoch=0, worktreeReady=false;
  panel.hidden=false;
  async function perform(fn){
    if(working)return;
    working=true;choose.disabled=propose.disabled=true;apply.disabled=true;runTests.disabled=true;codexButton.disabled=true;
    const current=epoch;
    try{await fn(current);}
    catch(error){if(current===epoch)feedback.textContent=error.message||'Operação não concluída.';}
    finally{working=false;choose.disabled=propose.disabled=false;runTests.disabled=!testFiles.options.length;codexButton.disabled=!worktreeReady;}
  }
  choose.onclick=()=>perform(async current=>{
    const result=await dev.choose();
    if(!result||current!==epoch)return;
    files.replaceChildren(...result.files.map(path=>{const option=document.createElement('option');option.value=path;option.textContent=path;return option;}));
    worktreeReady=false;review.textContent='';testFiles.replaceChildren();testOutput.textContent='';feedback.textContent=result.root;
  });
  revoke.onclick=async()=>{
    epoch++;worktreeReady=false;codexButton.disabled=true;apply.disabled=true;runTests.disabled=true;testFiles.replaceChildren();testOutput.textContent='';files.replaceChildren();review.textContent='';
    await dev.revoke();feedback.textContent='Acesso revogado.';
  };
  propose.onclick=()=>perform(async current=>{
    const paths=Array.from(files.selectedOptions,o=>o.value);
    feedback.textContent='Preparando proposta...';review.textContent='';
    const result=await dev.propose(byId('developer-task').value,paths);
    if(current!==epoch)return;
    review.textContent=result.summary+'\n\n'+result.changes.map(c=>'Arquivo: '+c.path+'\nConteúdo proposto:\n'+c.text).join('\n\n');
    apply.disabled=!result.changes.length;feedback.textContent='Revise o conteúdo antes de aplicar.';
  });
  apply.onclick=()=>perform(async current=>{
    feedback.textContent='Criando branch isolada...';
    const result=await dev.apply();
    if(current!==epoch)return;
    worktreeReady=true;
    review.textContent='Branch: '+result.branch+'\nPasta: '+result.directory+'\nSintaxe: '+(result.syntax.map(r=>r.path+': '+(r.ok?'OK':'FALHOU')).join(', ')||'Nenhum JavaScript verificado')+'\n\n'+result.diff;
    testFiles.replaceChildren(...result.tests.map(path=>{const option=document.createElement('option');option.value=path;option.textContent=path;return option;}));
    testOutput.textContent='';
    feedback.textContent='Alterações locais prontas para revisão. Nenhum commit ou push realizado.';
  });
  runTests.onclick=()=>perform(async current=>{
    const paths=Array.from(testFiles.selectedOptions,o=>o.value);
    feedback.textContent='Executando testes autorizados...';
    const result=await dev.test(paths);
    if(current!==epoch)return;
    testOutput.textContent=result.output;
    feedback.textContent=result.ok?'Testes selecionados passaram.':'Testes falharam ou não puderam executar.';
  });
  codexButton.onclick=()=>perform(async current=>{
    feedback.textContent='Codex trabalhando na cópia isolada...';
    const result=await dev.codex(byId('developer-task').value);
    if(current!==epoch)return;
    review.textContent='Arquivos alterados:\n'+result.status+'\n\n'+result.diff;
    testOutput.textContent=result.output;
    testFiles.replaceChildren(...result.tests.map(path=>{const option=document.createElement('option');option.value=path;option.textContent=path;return option;}));
    feedback.textContent=result.ok?'Codex terminou. Revise as alterações, inclusive arquivos novos.':'Codex não concluiu. Revise alterações parciais.';
  });
}
