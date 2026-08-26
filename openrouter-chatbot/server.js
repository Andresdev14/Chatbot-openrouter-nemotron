const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Cambia el modelo fácilmente aquí
const MODEL = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-lightning:free';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SYSTEM_PROMPT = 'Eres un asistente útil, claro y amigable. Responde en español.';
const MAX_MESSAGE_LENGTH = 4000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid request: messages must be a non-empty array');
  }

  const userMessages = messages.filter((message) => message.role !== 'system');
  if (userMessages.some((message) => !['user', 'assistant'].includes(message.role))) {
    throw new Error('Invalid message role');
  }

  if (userMessages.some((message) => typeof message.content !== 'string' || message.content.length > MAX_MESSAGE_LENGTH)) {
    throw new Error(`Message content must be text with at most ${MAX_MESSAGE_LENGTH} characters`);
  }

  // El frontend no puede sustituir las instrucciones del sistema.
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...userMessages];
}

async function getAssistantReply(messages) {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'tu_api_key_aqui') {
    throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7 })
  });

  if (!response.ok) {
    const errText = await response.text();
    const error = new Error(`OpenRouter error (${response.status}) con ${MODEL}: ${errText}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }

  const data = await response.json();
  const assistantReply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;

  if (!assistantReply) {
    throw new Error('No assistant reply found in OpenRouter response');
  }

  return assistantReply;
}

app.post('/api/chat', async (req, res) => {
  try {
    const messages = validateMessages(req.body.messages);

    return res.json({ reply: await getAssistantReply(messages) });
  } catch (err) {
    console.error('Error en /api/chat:', err);
    const status = err.status || (err.message.startsWith('Invalid') || err.message.startsWith('Message') ? 400 : 500);
    if (err.retryAfter) res.set('Retry-After', err.retryAfter);
    return res.status(status).json({ error: err.message, retryAfter: err.retryAfter || undefined });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = { getAssistantReply, validateMessages, SYSTEM_PROMPT };
