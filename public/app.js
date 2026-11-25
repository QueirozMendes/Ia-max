import { moveMouth, setAvatarState } from './avatar.js';
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
let ownerName = 'Gabriel';
let modelConfigured;
let modelSetupError;
let remoteCodex = false;
let expressiveVoice = false;
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
    frameButton.hidden = !supportsVision;
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

document.querySelectorAll('[data-panel]').forEach(button => {
  button.onclick = () => {
    if (button.dataset.panel !== 'chat') stopVoiceSession();
    document.querySelectorAll('[data-panel]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
      byId(item.dataset.panel).hidden = !selected;
    });
  };
});

fetch('/api/status').then(response => response.json()).then(({ configured, configurationError, owner, provider, providerName, codexAvailable, expressiveVoice: available }) => {
  ownerName = owner;
  modelConfigured = configured;
  modelSetupError = configurationError;
  remoteCodex = codexAvailable === true;
  expressiveVoice = available === true;
  codexMode.parentElement.lastChild.textContent = codexAvailable ? ' Codex · OpenAI' : ' Programação · ' + providerName;
  codexMode.parentElement.title = codexAvailable
    ? 'Envia a pergunta atual e o anexo escolhido ao Codex da OpenAI.'
    : 'Usa o modelo atual com instruções focadas em programação.';
  if (expressiveVoice) {
    greet.disabled = false;
    voiceMode.disabled = false;
  }
  supportsVision = configured && provider === 'openai';
  if (cameraStream) frameButton.hidden = !supportsVision;
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

function stopSpeaking() {
  const active = playback;
  if (!active) return;
  playback = undefined;
  active.controller.abort();
  clearTimeout(active.timeout);
  active.audio?.pause();
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

async function speak(text, button, label = 'Ouvir', onDone) {
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

  if (expressiveVoice && spoken.length <= 2400) {
    setPresence('thinking', 'Preparando a voz');
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken }),
        signal: active.controller.signal,
      });
      if (!response.ok) throw new Error('Voz indisponível');
      const blob = await response.blob();
      if (playback !== active) return;
      active.url = URL.createObjectURL(blob);
      active.audio = new Audio(active.url);
      active.audio.onplaying = () => {
        if (playback === active) setPresence('speaking', 'Falando');
      };
      active.audio.onended = () => finishSpeaking(active);
      active.audio.onerror = () => { if (playback === active) stopSpeaking(); };
      await active.audio.play();
      return;
    } catch {
      if (playback !== active) return;
      status.textContent = 'A voz expressiva ficou indisponível. Usando a voz do dispositivo.';
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
  utterance.rate = .91;
  utterance.pitch = 1.07;
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

byId('new-chat').onclick = () => {
  if (pending) return;
  if (messages.length && !window.confirm('Apagar a conversa atual e começar outra?')) return;
  if (!save('conversation', [], status)) return;
  messages = [];
  status.textContent = '';
  stopVoiceSession();
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

const dictationFallback = 'Você também pode clicar no campo de mensagem e usar o Ditado do macOS pelo atalho configurado em Ajustes do Sistema → Teclado.';
if (!SpeechRecognition) {
  continuousVoice.disabled = true;
  mic.onclick = () => {
    showMicFeedback('Este navegador não oferece reconhecimento de voz. ' + dictationFallback);
    message.focus();
  };
} else {
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  let listening = false;
  let transcript = '';
  let failed = false;
  let voiceSession = false;
  let discard = false;
  const errors = {
    'not-allowed': 'O navegador bloqueou o microfone. Permita o acesso nas configurações do site e tente novamente.',
    'service-not-allowed': 'Este navegador bloqueou o serviço de ditado. ' + dictationFallback,
    'audio-capture': 'Não consegui acessar o microfone. Confira o dispositivo de entrada nos ajustes do Mac.',
    'no-speech': 'Não detectei fala. Clique em Falar com a Max e tente novamente.',
    network: 'O serviço de ditado do navegador não respondeu. ' + dictationFallback,
    'language-not-supported': 'O navegador não oferece ditado em português nesta configuração. ' + dictationFallback,
  };
  recognition.onstart = () => {
    showMicFeedback('Microfone ativo. Fale agora.');
    setPresence('listening', 'Escutando');
  };
  recognition.onerror = event => {
    if (discard) return;
    failed = true;
    showMicFeedback(errors[event.error] || 'O ditado foi interrompido. ' + dictationFallback);
  };
  recognition.onresult = event => {
    transcript = event.results[0][0].transcript.trim();
  };
  recognition.onend = () => {
    listening = false;
    if (!pending) setPresence('idle', 'Pronta para conversar');
    if (discard || failed || !transcript) {
      resetVoiceSession();
      if (discard) return;
      if (!failed) showMicFeedback('Nenhuma fala reconhecida. Tente falar novamente. ' + dictationFallback);
      return;
    }
    message.value = (message.value + ' ' + transcript).trim().slice(0, 10_000);
    message.focus();
    if (modelConfigured === false && !(remoteCodex && codexMode.checked)) {
      resetVoiceSession();
      showMicFeedback('Ouvi: “' + transcript + '”. O microfone funcionou. ' + modelSetupError);
      return;
    }
    showMicFeedback('Ouvi: “' + transcript + '”.');
    if (!voiceSession) resetVoiceSession();
    if (voiceMode.checked && !byId('send').disabled) {
      nextSpokenTurn = true;
      byId('chat-form').requestSubmit();
    } else {
      resetVoiceSession();
    }
  };
  function resetVoiceSession() {
    voiceSession = false;
    mic.textContent = 'Falar com a Max';
    mic.setAttribute('aria-pressed', 'false');
  }
  stopVoiceSession = () => {
    resetVoiceSession();
    if (listening) {
      discard = true;
      recognition.abort();
    }
  };
  function startListening() {
    try {
      transcript = '';
      failed = false;
      discard = false;
      recognition.start();
      listening = true;
      mic.textContent = continuousVoice.checked ? 'Encerrar conversa por voz' : 'Parar de escutar';
      mic.setAttribute('aria-pressed', 'true');
      showMicFeedback('Abrindo o microfone…');
    } catch {
      resetVoiceSession();
      showMicFeedback('Não consegui iniciar o ditado. ' + dictationFallback);
    }
  }
  continueVoiceSession = () => {
    if (voiceSession && continuousVoice.checked && voiceMode.checked && !document.hidden && !byId('chat').hidden) {
      startListening();
    } else {
      resetVoiceSession();
    }
  };
  continuousVoice.onchange = () => {
    if (!continuousVoice.checked && voiceSession) stopVoiceSession();
  };
  voiceMode.onchange = () => {
    if (!voiceMode.checked && voiceSession) stopVoiceSession();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && voiceSession) stopVoiceSession();
  });
  mic.onclick = () => {
    if (voiceSession) {
      stopVoiceSession();
      showMicFeedback('Conversa por voz encerrada.');
      return;
    }
    if (listening) return recognition.stop();
    if (pending) return showMicFeedback('Aguarde a resposta atual para falar novamente.');
    stopSpeaking();
    voiceSession = continuousVoice.checked && voiceMode.checked;
    startListening();
  };
}

byId('chat-form').onsubmit = async event => {
  event.preventDefault();
  const spokenTurn = nextSpokenTurn;
  nextSpokenTurn = false;
  const content = message.value.trim();
  if (pending || byId('send').disabled || !content) return;

  const memoryRequest = content.match(/^lembre\s+que(?:\s+([\s\S]+))?$/i);
  if (memoryRequest) {
    if (spokenTurn) stopVoiceSession();
    const note = memoryRequest[1]?.trim();
    if (!note) {
      status.textContent = 'Escreva o que você quer guardar depois de “Lembre que”.';
      return;
    }
    const next = [memory, note].filter(Boolean).join('\n');
    if (next.length > 6000) {
      status.textContent = 'A memória atingiu o limite. Você pode liberar espaço na aba Memória.';
      return;
    }
    if (saveMemory(next, status)) {
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
    messages.push(user, { role: 'assistant', content: result.answer, sources: result.sources });
    messages = messages.slice(-100);
    status.textContent = result.incomplete ? 'A resposta atingiu o limite de tamanho.' : '';
    save('conversation', messages, status);
    message.value = '';
    clearAttachment();
    cameraFrame = undefined;
    frameButton.textContent = 'Compartilhar foto';
    setReference();
    byId('use-tasks').checked = false;
    codexMode.checked = false;
    renderConversation();
    if (voiceMode.checked) speak(result.answer, undefined, undefined, spokenTurn ? continueVoiceSession : undefined);
    else if (spokenTurn) stopVoiceSession();
  } catch (error) {
    if (spokenTurn) stopVoiceSession();
    status.textContent = error instanceof TypeError ? 'Não consegui conectar ao servidor da Max.' : error.message;
  } finally {
    pending = false;
    if (!playback) setPresence('idle', 'Pronta para conversar');
    controls.forEach(control => control.disabled = false);
    if (!byId('chat').hidden) message.focus();
  }
};

function saveMemory(next, feedback) {
  if (!save('memory', next, feedback)) return false;
  memory = next;
  byId('memory-text').value = next;
  return true;
}

byId('memory-form').onsubmit = event => {
  event.preventDefault();
  const next = byId('memory-text').value.trim();
  if (next.length > 6000) {
    byId('memory-status').textContent = 'A memória deve ter até 6.000 caracteres.';
    return;
  }
  if (saveMemory(next, byId('memory-status'))) {
    byId('memory-status').textContent = 'Memória salva.';
  }
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

function updateTasks(next) {
  const feedback = byId('task-status');
  feedback.textContent = '';
  const saved = save('tasks', next, feedback);
  if (saved) tasks = next;
  renderTasks();
  return saved;
}

byId('task-form').onsubmit = event => {
  event.preventDefault();
  const field = byId('task-text');
  const title = field.value.trim();
  if (title && updateTasks([...tasks, { title, done: false, id: crypto.randomUUID() }])) field.value = '';
};

renderConversation();
renderTasks();

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
