import { createClient, AnamEvent } from '../js/vendor/anam-sdk-4.27.0-pv1.js';

const el = id => document.getElementById(id);
let client = null, endTimer = null, connectTimer = null, started = false, stopped = true;
const turns = [], seen = new Map();

function render() {
  el('transcript').textContent = turns.map(t => `${t.role === 'user' ? 'VISITOR' : 'NINA'}: ${t.content}`).join('\n\n');
  el('export').disabled = turns.length === 0;
}
function controls(ready) {
  el('message').disabled = !ready;
  el('send').disabled = !ready;
}
async function stop(reason = 'Session stopped.') {
  if (stopped) return;
  stopped = true;
  clearTimeout(endTimer);
  clearTimeout(connectTimer);
  controls(false);
  el('stop').disabled = true;
  const active = client;
  client = null;
  try { await active?.stopStreaming(); }
  catch { reason += ' The remote close could not be confirmed.'; }
  el('status').textContent = reason;
  el('start').disabled = false;
  el('token').disabled = false;
}
el('start').addEventListener('click', async () => {
  const token = el('token').value.trim();
  if (!token || !stopped) return;
  turns.length = 0; seen.clear(); render();
  stopped = false; started = false;
  el('start').disabled = true; el('token').disabled = true; el('stop').disabled = false;
  el('status').textContent = 'Connecting without microphone...';
  try {
    const active = createClient(token, { disableInputAudio: true });
    client = active;
    el('token').value = '';
    active.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, history => {
      if (client !== active || !Array.isArray(history)) return;
      for (const item of history) {
        if (item.role !== 'persona' || typeof item.content !== 'string') continue;
        const id = item.id ?? item.messageId ?? item.content;
        const previous = seen.get(id);
        if (previous !== undefined) turns[previous].content = item.content;
        else { seen.set(id, turns.length); turns.push({ role: 'persona', content: item.content }); }
      }
      render();
    });
    active.addListener(AnamEvent.CONNECTION_CLOSED, () => {
      if (client === active) void stop('Connection closed.');
    });
    active.addListener(AnamEvent.SESSION_READY, () => {
      if (client !== active || stopped) return;
      clearTimeout(connectTimer);
      started = true; controls(true);
      el('status').textContent = 'Connected. Text input is ready.';
    });
    endTimer = setTimeout(() => void stop('Three-minute test limit reached.'), 180000);
    connectTimer = setTimeout(() => {
      if (!started && client === active) void stop('Connection was not ready within 30 seconds.');
    }, 30000);
    await active.streamToVideoElement('avatar');
  } catch (error) {
    await stop(`Could not connect: ${error?.message || 'unknown error'}`);
  }
});
el('send').addEventListener('click', () => {
  const content = el('message').value.trim();
  if (!client || stopped || !content) return;
  try {
    client.sendUserMessage(content);
    turns.push({ role: 'user', content }); render(); el('message').value = '';
  } catch (error) { el('status').textContent = `Message not sent: ${error?.message || 'unknown error'}`; }
});
el('stop').addEventListener('click', () => void stop());
window.addEventListener('pagehide', () => { void stop(); });
el('export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ source: 'Anam native text test', turns }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'nina-text-test.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
