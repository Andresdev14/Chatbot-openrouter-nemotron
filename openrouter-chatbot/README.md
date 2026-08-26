# OpenRouter Chatbot (ejemplo simple)

Proyecto educativo y de prueba: una pequeña aplicación web que muestra cómo integrar la API de OpenRouter para crear un chatbot.

**Estructura**

```
openrouter-chatbot/
│
├── server.js
├── package.json
├── .env
├── .gitignore
│
├── public/
│   ├── index.html
│   ├── style.css
   └── script.js
└── README.md

## OpenRouter Chatbot

Aplicación educativa mínima para entender la comunicación:

```text
Frontend -> Backend Express -> OpenRouter -> Backend -> Frontend
```

El proyecto permite conversar con el modelo `nvidia/nemotron-3.5-lightning:free` desde una interfaz web o directamente desde la terminal.

## Tecnologías

- Node.js
- Express.js
- JavaScript
- HTML5 y CSS3
- Fetch API
- OpenRouter API
- dotenv

No utiliza React, TypeScript, base de datos, autenticación, streaming, RAG ni memoria permanente.

## Requisitos

- Node.js 18 o superior. El proyecto usa `fetch`, disponible de forma nativa desde Node.js 18.
- npm, incluido normalmente con Node.js.
- Una cuenta y una API key de OpenRouter.

Para instalar Node.js, descarga la versión LTS desde https://nodejs.org/ y sigue el instalador. Después comprueba la instalación:

```bash
node --version
npm --version
```

## Estructura

```text
openrouter-chatbot/
├── server.js           # Servidor Express y conexión con OpenRouter
├── console.js          # Cliente de chatbot para la terminal
├── guardrail.test.js   # Pruebas del guardrail
├── package.json        # Dependencias y scripts
├── package-lock.json   # Versiones instaladas por npm
├── .env                # Configuración local, no se publica
├── .gitignore
├── public/
│   ├── index.html      # Estructura de la interfaz web
│   ├── style.css       # Estilos
│   └── script.js       # Historial y peticiones desde el navegador
└── README.md
```

## Instalación

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

## Configurar OpenRouter

1. Entra en https://openrouter.ai.
2. Crea una cuenta o inicia sesión.
3. Abre la sección de API keys.
4. Genera una clave nueva.
5. Edita el archivo `.env` en la raíz del proyecto.

El archivo debe tener esta forma, usando tu clave local:

```env
OPENROUTER_API_KEY=tu_api_key_aqui
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
```

No incluyas una clave real en este README ni la subas a Git. El archivo `.env` está incluido en `.gitignore`.

## Ejecutar el chatbot en la terminal

Esta es la forma más directa de probar la integración con OpenRouter:

```bash
npm run console
```

Cuando aparezca `Tú:`, escribe un mensaje y pulsa Enter:

```text
Chatbot de consola iniciado. Escribe "salir" para terminar.
Tú: Hola, ¿qué puedes hacer?
```

Escribe `salir` para terminar. El historial se mantiene en memoria durante esa ejecución e incluye un mensaje `system` que indica al modelo responder en español.

## Ejecutar la interfaz web

Inicia el servidor en modo desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000 en el navegador. También puedes usar el modo normal:

```bash
npm start
```

La interfaz permite escribir mensajes, enviarlos con el botón **Enviar** o pulsando Enter, ver el historial, mostrar el estado `La IA está escribiendo...` y visualizar errores.

## Flujo de una conversación

1. `public/script.js` mantiene el arreglo `messages` en el navegador.
2. El arreglo contiene mensajes con roles `system`, `user` y `assistant`.
3. El navegador envía el historial a `POST /api/chat`.
4. `server.js` valida los mensajes y vuelve a imponer el `system prompt`.
5. El backend agrega la API key desde `.env` y llama a OpenRouter.
6. OpenRouter responde con `choices[0].message.content`.
7. El backend devuelve únicamente `{ "reply": "..." }`.
8. El frontend agrega la respuesta al historial y la muestra.

Ejemplo de mensajes:

```json
[
  {"role":"system","content":"Eres un asistente útil, claro y amigable. Responde en español."},
  {"role":"user","content":"Hola"},
  {"role":"assistant","content":"¡Hola! ¿Cómo estás?"}
]
```

## Endpoint del backend

### `POST /api/chat`

Entrada:

```json
{
  "messages": [
    {"role":"user","content":"Hola"}
  ]
}
```

Respuesta correcta:

```json
{
  "reply": "¡Hola! ¿En qué puedo ayudarte?"
}
```

El navegador solo se comunica con `/api/chat`. La API key nunca se envía al frontend.

## Guardrail básico

Antes de contactar con OpenRouter, el backend:

- Reemplaza cualquier mensaje `system` recibido por el mensaje de sistema de la aplicación.
- Solo acepta roles `user` y `assistant` además del `system` recibido.
- Exige contenido de texto.
- Limita cada mensaje a 4000 caracteres.

Ejecuta las pruebas con:

```bash
npm test
```

Estas protecciones son educativas y no sustituyen un sistema completo de moderación, autenticación o control de abuso.

## Errores frecuentes

- `401`: API key inválida, revocada o mal escrita.
- `402`: no hay crédito o el modelo no está disponible para tu cuenta.
- `404`: el identificador del modelo no existe.
- `429`: el proveedor alcanzó un límite temporal de solicitudes.
- `503`: el proveedor está temporalmente no disponible.
- `fetch failed`: problema de red, DNS, conexión o acceso al servicio.
- `OpenRouter API key not configured`: falta `OPENROUTER_API_KEY` en `.env`.

Los errores de OpenRouter se imprimen en la terminal y se muestran en la consola o en la interfaz web.

## Cambiar el modelo

Este proyecto queda configurado con un único modelo:

```env
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
```

Para cambiarlo, sustituye el valor por el identificador exacto de otro modelo disponible en OpenRouter y reinicia el servidor o la consola. Cada ejecución utiliza exclusivamente el modelo configurado y realiza una sola petición.

## Seguridad

- La API key solo se lee en `server.js` mediante `dotenv`.
- `public/script.js` nunca contiene la API key.
- El backend es el único componente que contacta con OpenRouter.
- `.env` y `node_modules/` están excluidos por `.gitignore`.
- Si una API key se expone, revócala y genera otra desde OpenRouter.
