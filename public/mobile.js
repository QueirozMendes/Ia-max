const install=document.getElementById('mobile-install');
const connection=document.getElementById('mobile-connection');
let promptEvent;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;install.hidden=false;});
install.addEventListener('click',async()=>{if(!promptEvent)return;const active=promptEvent;promptEvent=undefined;install.hidden=true;await active.prompt();});
window.addEventListener('appinstalled',()=>{install.hidden=true;promptEvent=undefined;});
function refresh(){connection.hidden=navigator.onLine;connection.textContent='Sem conexão com a rede. Reconecte ao Tailscale e verifique o Max Core.';}
window.addEventListener('online',refresh);window.addEventListener('offline',refresh);refresh();
if('serviceWorker' in navigator && window.isSecureContext && !window.maxDeveloper)navigator.serviceWorker.register('/sw.js').catch(()=>{});
