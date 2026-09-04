const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Cambia el modelo fácilmente aquí
// Para ver modelos disponibles: https://openrouter.ai/api/v1/models
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
const MODEL_FALLBACK = process.env.OPENROUTER_MODEL_FALLBACK || 'google/gemma-2-9b-it:free';
const MODEL_FALLBACK_2 = process.env.OPENROUTER_MODEL_FALLBACK_2 || 'undi95/remm-slerp-l2-13bfp16:free';
const MODEL_FALLBACK_3 = process.env.OPENROUTER_MODEL_FALLBACK_3 || 'teknium/openhermes-2-mistral-7b:free';
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

  const models = [...new Set([MODEL, MODEL_FALLBACK, MODEL_FALLBACK_2, MODEL_FALLBACK_3])];
  let lastError;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const requestPayload = { model, messages, temperature: 0.7 };

    console.log('\n========== OPENROUTER UPSTREAM REQUEST ==========');
    console.log(`📤 URL: ${OPENROUTER_API_URL}`);
    console.log(`📦 Model: ${model}`);
    console.log(`💬 Messages count: ${messages.length}`);
    console.log('===============================================\n');

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'OpenRouter Chatbot'
        },
        body: JSON.stringify(requestPayload)
      });

      console.log(`\n========== OPENROUTER RESPONSE (${model}) ==========`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`Headers:`, {
        'content-type': response.headers.get('content-type'),
        'x-ratelimit-limit-requests': response.headers.get('x-ratelimit-limit-requests'),
        'x-ratelimit-remaining-requests': response.headers.get('x-ratelimit-remaining-requests'),
        'x-ratelimit-reset-requests': response.headers.get('x-ratelimit-reset-requests')
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Error response (${response.status}): ${errText}`);
        
        // Los limites del proveedor pueden afectar a un modelo concreto.
        if ([404, 429, 503, 504].includes(response.status) && modelIndex < models.length - 1) {
          console.log(`⚠️  OpenRouter returned ${response.status} for ${model}. Trying fallback model...`);
          lastError = new Error(`OpenRouter ${response.status}: Service temporarily unavailable`);
          continue;
        }
        
        const error = new Error(`OpenRouter error (${response.status}): ${errText}`);
        error.status = response.status;
        error.retryAfter = response.headers.get('retry-after');
        throw error;
      }

      const data = await response.json();
      console.log(`✅ Response received:`, JSON.stringify(data, null, 2));

      const assistantReply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;

      if (!assistantReply) {
        throw new Error('No assistant reply found in OpenRouter response');
      }

      console.log(`✨ Assistant reply: ${assistantReply.substring(0, 100)}...`);
      console.log('=========================================\n');

      return assistantReply;
    } catch (err) {
      lastError = err;
      if (modelIndex < models.length - 1 && (err.message.includes('404') || err.message.includes('429') || err.message.includes('503') || err.message.includes('504'))) {
        console.log(`⚠️  Retrying with fallback model after ${model} failed...`);
        continue;
      }
      console.error(`\n❌ Fetch error:`, err.message);
      console.log('=========================================\n');
      throw err;
    }
  }

  throw lastError || new Error('Failed after multiple attempts');
}

app.post('/api/chat', async (req, res) => {
  try {
    console.log('\n🔹 CLIENT REQUEST RECEIVED');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`📥 Received ${req.body.messages?.length || 0} messages from client`);
    
    const messages = validateMessages(req.body.messages);
    console.log(`✓ Messages validated successfully`);

    const reply = await getAssistantReply(messages);
    
    console.log('\n✅ RESPONSE SENT TO CLIENT\n');
    return res.json({ reply });
  } catch (err) {
    console.error('\n❌ ERROR IN /api/chat:', err.message);
    const status = err.status || (err.message.startsWith('Invalid') || err.message.startsWith('Message') ? 400 : 500);
    if (err.retryAfter) res.set('Retry-After', err.retryAfter);
    return res.status(status).json({ error: err.message, retryAfter: err.retryAfter || undefined });
  }
});

if (require.main === module) {
  // Verificar configuración antes de iniciar
  console.log('\n🚀 STARTING OPENROUTER CHATBOT SERVER');
  console.log('=====================================');
  console.log(`📡 PORT: ${PORT}`);
  console.log(`🤖 MODEL: ${MODEL}`);
  console.log(`🔑 API Key configured: ${(process.env.OPENROUTER_API_KEY || '').trim() ? '✓ Yes' : '✗ NO'}`);
  console.log(`🌐 OpenRouter URL: ${OPENROUTER_API_URL}`);
  console.log('=====================================');
  console.log('📝 How to change model:');
  console.log('   1. Edit .env file, change OPENROUTER_MODEL value');
  console.log('   2. Restart server (npm start)');
  console.log('   3. Find models at: https://openrouter.ai/api/v1/models\n');

  app.listen(PORT, () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
    console.log('Ready to receive requests...\n');
  });
}

module.exports = { getAssistantReply, validateMessages, SYSTEM_PROMPT };
