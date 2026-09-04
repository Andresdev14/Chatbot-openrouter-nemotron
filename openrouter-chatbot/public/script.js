const chatEl = document.getElementById('chat');
const form = document.getElementById('chat-form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear-chat');
const loadingEl = document.getElementById('loading');
const chatArea = document.querySelector('.chat-area');

// Mantener historial en memoria durante la sesión
const systemMessage = { role: 'system', content: 'Eres un asistente útil, claro y amigable. Responde en español.' };
const messages = [systemMessage];

function renderMessages() {
  chatEl.innerHTML = '';
  messages.forEach((m) => {
    if (m === systemMessage) return; // No mostrar mensaje del sistema
    
    const div = document.createElement('div');
    div.className = 'message ' + (m.role === 'user' ? 'user' : 'assistant');
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = m.content;
    
    div.appendChild(content);
    chatEl.appendChild(div);
  });
  
  // Auto-scroll al final
  setTimeout(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  }, 0);
}

function showLoading() {
  loadingEl.style.display = 'flex';
  setTimeout(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  }, 0);
}

function hideLoading() {
  loadingEl.style.display = 'none';
}

async function sendMessage(text) {
  if (!text.trim()) return;
  
  // Añadir mensaje del usuario localmente
  const userMsg = { role: 'user', content: text };
  messages.push(userMsg);
  renderMessages();
  
  // Mostrar indicador de escritura
  showLoading();
  
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
    // Añadir respuesta del asistente
    messages.push({ role: 'assistant', content: data.reply });
    hideLoading();
    renderMessages();
  } catch (err) {
    console.error('Error:', err);
    const errorMessage = err instanceof TypeError && err.message === 'Failed to fetch'
      ? 'No se pudo conectar con el servidor. Abre http://localhost:3001 y comprueba que npm run dev siga ejecutandose.'
      : `Error: ${err.message}`;
    messages.push({ role: 'assistant', content: errorMessage });
    hideLoading();
    renderMessages();
  } finally {
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
    input.style.height = 'auto';
  }
}

// Auto-resize textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
});

// Enviar con Enter (sin Shift)
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// Enviar con botón
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  sendMessage(text);
});

// Limpiar chat
clearBtn.addEventListener('click', () => {
  if (confirm('¿Estás seguro de que quieres limpiar el chat?')) {
    messages.length = 1; // Mantener solo el mensaje del sistema
    renderMessages();
    input.focus();
  }
});

// Render inicial
renderMessages();
input.focus();
