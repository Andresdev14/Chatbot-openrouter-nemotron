const chatEl = document.getElementById('chat');
const form = document.getElementById('chat-form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

// Mantener historial en memoria durante la sesión
const systemMessage = { role: 'system', content: 'Eres un asistente útil, claro y amigable. Responde en español.' };
const messages = [systemMessage];

function renderMessages() {
  chatEl.innerHTML = '';
  messages.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'message ' + (m.role === 'user' ? 'user' : (m.role === 'assistant' ? 'assistant' : 'system'));
    div.textContent = m.content;
    chatEl.appendChild(div);
  });
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function sendMessage(text) {
  if (!text) return;
  // Añadir mensaje del usuario localmente
  const userMsg = { role: 'user', content: text };
  messages.push(userMsg);
  renderMessages();

  // Indicador de escritura
  const typingIndicator = { role: 'assistant', content: 'La IA está escribiendo...' };
  messages.push(typingIndicator);
  renderMessages();

  // Deshabilitar UI
  sendBtn.disabled = true;
  input.disabled = true;

  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || err.details || 'Error en la petición');
    }

    const data = await resp.json();
    // Reemplazar indicador por la respuesta real
    messages.pop();
    messages.push({ role: 'assistant', content: data.reply });
    renderMessages();
  } catch (err) {
    messages.pop();
    messages.push({ role: 'assistant', content: 'Error: ' + err.message });
    renderMessages();
  } finally {
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendMessage(text);
});

// Enviar con Enter (sin Shift)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// Render inicial
renderMessages();
