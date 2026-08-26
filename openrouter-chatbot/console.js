const readline = require('readline');
const { getAssistantReply, SYSTEM_PROMPT } = require('./server');

const messages = [
  { role: 'system', content: SYSTEM_PROMPT }
];

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Tú: '
});

let closed = false;
let processing = false;

console.log('Chatbot de consola iniciado. Escribe "salir" para terminar.');
terminal.prompt();

terminal.on('line', async (text) => {
  if (processing) return;
  const content = text.trim();
  if (!content) {
    if (!closed) terminal.prompt();
    return;
  }

  if (content.toLowerCase() === 'salir') {
    terminal.close();
    return;
  }

  processing = true;
  messages.push({ role: 'user', content });
  process.stdout.write('IA: ');

  try {
    const reply = await getAssistantReply(messages);
    messages.push({ role: 'assistant', content: reply });
    console.log(reply);
  } catch (error) {
    messages.pop();
    console.log(`Error: ${error.message}`);
  } finally {
    processing = false;
    if (!closed) terminal.prompt();
  }
});

terminal.on('close', () => {
  closed = true;
  console.log('Chatbot finalizado.');
});
