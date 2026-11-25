import { app, BrowserWindow, Tray, Menu, nativeImage, session, dialog, globalShortcut, desktopCapturer, powerMonitor, screen } from 'electron';
import { createWindowsControl } from './windows-control.js';
import { appendFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
try { process.loadEnvFile(join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
const origin = 'http://127.0.0.1:' + port;
const password = process.env.MAX_REMOTE_PASSWORD;
let main, tray, companion, quitting = false, microphoneAllowed = false, screenAllowed = false;
const trusted = url => { try { return new URL(url).origin === origin; } catch { return false; } };
function show() { if (main) { main.show(); main.focus(); } }
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', show);
  app.whenReady().then(() => {
    const ses = session.fromPartition('max-desktop');
    ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) =>
      wc === main?.webContents && trusted(requestingOrigin) && permission === 'media' &&
      microphoneAllowed && details.mediaType === 'audio');
    ses.setPermissionRequestHandler((wc, permission, callback, details) => {
      const audioOnly = details.mediaTypes?.length === 1 && details.mediaTypes[0] === 'audio';
      callback(wc === main?.webContents && trusted(details.requestingUrl) && permission === 'media' && audioOnly && microphoneAllowed);
    });
    ses.setDisplayMediaRequestHandler(async (request, callback) => {
      if (!screenAllowed || request.frame !== main?.webContents.mainFrame || !trusted(request.securityOrigin)) return callback({});
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
        const display = screen.getPrimaryDisplay();
        const source = sources.find(item => item.display_id === String(display.id));
        if (!source || !screenAllowed) return callback({});
        callback({ video: source });
      } catch { callback({}); }
    });
    main = new BrowserWindow({
      width: 1100, height: 780, minWidth: 360, minHeight: 480, show: false,
      title: 'Max', backgroundColor: '#15131e',
      webPreferences: { session: ses, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, backgroundThrottling: false }
    });
    main.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    main.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    main.webContents.on('will-redirect', (event, url) => { if (!trusted(url)) event.preventDefault(); });
    app.on('login', (event, wc, details, auth, callback) => {
      if ((wc !== main?.webContents && wc !== companion?.webContents) || auth.isProxy || !trusted(details.url) || !password || !process.env.MAX_REMOTE_ORIGIN) return;
      event.preventDefault();
      callback('max', password);
    });
    main.on('close', event => { if (!quitting) { event.preventDefault(); main.hide(); } });
    main.once('ready-to-show', show);
    const icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#6946ad"/><path d="M16 4L19 13L28 16L19 19L16 28L13 19L4 16L13 13Z" fill="white"/></svg>').toString('base64'));
    tray = new Tray(icon);
    tray.setToolTip('Max · Assistente pessoal');
    function toggleCompanion() {
      if (companion && !companion.isDestroyed()) { companion.close(); return; }
      const area = screen.getPrimaryDisplay().workArea;
      companion = new BrowserWindow({
        width: 280, height: 420, x: area.x + Math.max(0, area.width - 300), y: area.y + Math.max(0, area.height - 440),
        frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: true, show: false,
        webPreferences: { session: ses, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true }
      });
      companion.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      companion.webContents.on('will-navigate', (event, url) => { if (!trusted(url)) event.preventDefault(); });
      companion.webContents.on('will-redirect', (event, url) => { if (!trusted(url)) event.preventDefault(); });
      companion.once('ready-to-show', () => companion?.showInactive());
      companion.on('closed', () => { companion = undefined; refreshMenu(); });
      companion.loadURL(origin + '/companion.html').catch(() => companion?.close());
      refreshMenu();
    }
    let controlEnabled = false, cursorPlay = false;
    const executeControl = createWindowsControl({root, idle:()=>powerMonitor.getSystemIdleTime(), available:()=>controlEnabled && powerMonitor.getSystemIdleState(20)!=='locked', confirm:async action=> (await dialog.showMessageBox(main,{type:'question',buttons:['Cancelar','Abrir'],defaultId:0,cancelId:0,message:'Abrir aplicativo: '+action.app+'?'})).response===1, audit:async entry=>{ const dir=join(root,'.runtime','logs'); await mkdir(dir,{recursive:true}); await appendFile(join(dir,'control.jsonl'),JSON.stringify({at:new Date().toISOString(),...entry})+'\n'); }});
    const cursorTimer=setInterval(()=>{if(cursorPlay && controlEnabled && powerMonitor.getSystemIdleTime()>=20 && main && !main.isFocused()) void executeControl({kind:'cursor-nudge'},{play:true});},60000);
    app.once('before-quit',()=>clearInterval(cursorTimer));
    function stopSensors() {
      controlEnabled = false; cursorPlay = false;
      screenAllowed = false;
      microphoneAllowed = false;
      main.webContents.reload();
      refreshMenu();
    }
    powerMonitor.on('lock-screen', stopSensors);
    powerMonitor.on('suspend', stopSensors);
    function refreshMenu() {
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Abrir Max', click: show },
        { label: companion ? 'Ocultar personagem' : 'Mostrar personagem flutuante', click: toggleCompanion },
        { label: 'Permitir captura do monitor principal', type: 'checkbox', checked: screenAllowed, click: item => {
          if (item.checked) {
            screenAllowed = dialog.showMessageBoxSync(main, { type: 'warning', buttons: ['Cancelar', 'Permitir'], defaultId: 0, cancelId: 0, message: 'Permitir captura do monitor principal nesta sessão?', detail: 'A captura pode conter informações privadas. A análise por IA exige autorização na janela principal.' }) === 1;
          } else { screenAllowed = false; main.webContents.reload(); }
          refreshMenu();
        }},
        { label: 'Desativar sensores e controle', click: stopSensors },
        { label: 'Controle do Windows', type: 'checkbox', enabled: process.platform === 'win32', checked: controlEnabled, click: item => {
          controlEnabled = item.checked;
          if (!controlEnabled) cursorPlay = false;
          refreshMenu();
        }},
        { label: 'Brincar com o cursor quando ocioso', type: 'checkbox', enabled: controlEnabled, checked: cursorPlay, click: item => { cursorPlay = item.checked; refreshMenu(); }},
        { label: 'Abrir aplicativo', enabled: controlEnabled, submenu: [
          {label:'Bloco de Notas',click:()=>void executeControl({kind:'open-app',app:'notepad'})},
          {label:'Calculadora',click:()=>void executeControl({kind:'open-app',app:'calculator'})},
          {label:'Explorador de Arquivos',click:()=>void executeControl({kind:'open-app',app:'explorer'})}
        ]},
        { label: 'Sempre visível', type: 'checkbox', checked: main.isAlwaysOnTop(), click: item => main.setAlwaysOnTop(item.checked) },
        { label: 'Permitir microfone nesta sessão', type: 'checkbox', checked: microphoneAllowed, click: item => {
          microphoneAllowed = item.checked;
          if (!microphoneAllowed) main.webContents.reload();
          refreshMenu();
        }},
        { label: 'Recarregar conexão', click: () => main.loadURL(origin).catch(() => {}) },
        { type: 'separator' },
        { label: 'Sair da Max (Core permanece ativo)', click: () => app.quit() }
      ]));
    }
    refreshMenu();
    tray.on('double-click', show);
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      stopSensors();
    });
    main.loadURL(origin).catch(() => {
      dialog.showErrorBox('Max Core indisponível', 'Inicie o Core com npm start ou pelo Agendador do Windows. Depois use Recarregar conexão na bandeja.');
      show();
    });
  }).catch(error => { dialog.showErrorBox('Max', error.message); app.quit(); });
  app.on('before-quit', () => { quitting = true; globalShortcut.unregisterAll(); });
  app.on('window-all-closed', () => {});
}
