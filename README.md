# OpenRouter Chatbot

Chatbot web en espanol construido con Node.js, Express y OpenRouter. La API key se mantiene en el backend y nunca se envia al navegador.

## Requisitos

- Node.js 18 o superior
- npm
- Una cuenta y una API key de [OpenRouter](https://openrouter.ai/)

## Instalacion

Desde esta carpeta, instala las dependencias:

```bash
npm install
```

Crea un archivo `.env` en la raiz del proyecto:

```env
OPENROUTER_API_KEY=tu_api_key_aqui
PORT=3001
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
OPENROUTER_MODEL_FALLBACK=liquid/lfm-2.5-2.6b:free
OPENROUTER_MODEL_FALLBACK_2=inclusionai/ling-3.0-flash-fin:free
```

Usa identificadores de modelos que esten disponibles en [OpenRouter Models](https://openrouter.ai/models). No publiques `.env` ni una API key real.

## Ejecutar la aplicacion web

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

Abre [http://localhost:3001](http://localhost:3001). Si cambias `PORT`, usa ese puerto en el navegador.

## Ejecutar la consola

```bash
npm run console
```

Escribe un mensaje y pulsa Enter. Usa `salir` para terminar.

## Como funciona

```text
Navegador -> Express -> OpenRouter -> Express -> Navegador
```

1. `public/script.js` conserva el historial de la conversacion en memoria.
2. El navegador envia el historial a `POST /api/chat`.
3. `server.js` valida los mensajes y aplica el prompt del sistema.
4. El backend llama a OpenRouter usando `OPENROUTER_API_KEY`.
5. Si el modelo principal devuelve `429`, `404`, `503` o `504`, se prueba el siguiente fallback configurado.
6. El backend devuelve la respuesta como `{ "reply": "..." }`.

## API

### `POST /api/chat`

Peticion:

```json
{
  "messages": [
    { "role": "user", "content": "Hola" }
  ]
}
```

Respuesta:

```json
{
  "reply": "Hola, ¿en que puedo ayudarte?"
}
```

El backend acepta mensajes `user` y `assistant`, limita cada contenido a 4000 caracteres y reemplaza cualquier mensaje `system` recibido por el prompt de la aplicacion.

## Pruebas

```bash
npm test
```

Las pruebas cubren la validacion de roles, el limite de longitud y la proteccion del prompt del sistema.

## Estructura

```text
openrouter-chatbot/
├── server.js           # Servidor Express y cliente de OpenRouter
├── console.js          # Cliente para la terminal
├── guardrail.test.js   # Pruebas de validacion
├── package.json
├── package-lock.json
├── .env                # Configuracion local, no se publica
└── public/
    ├── index.html      # Interfaz web
    ├── script.js       # Logica del chat
    └── style.css       # Estilos
```

## Errores frecuentes

- `401`: la API key es invalida o fue revocada.
- `402`: no hay credito o el modelo no esta disponible para la cuenta.
- `404`: el modelo no existe o fue retirado. Configura otro identificador.
- `429`: el proveedor alcanzo un limite temporal. El servidor intenta los fallbacks configurados.
- `503` o `504`: el proveedor esta temporalmente no disponible. El servidor intenta otro modelo.
- `Failed to fetch`: comprueba que el servidor este ejecutandose y que abras la URL correcta, normalmente `http://localhost:3001`.

Los detalles de las peticiones y respuestas se muestran en la terminal donde se ejecuto el servidor.

## Seguridad

- No incluyas la API key en `public/` ni en el frontend.
- No subas `.env` al repositorio.
- Si una API key se expone, revocala y genera una nueva en OpenRouter.
- Las validaciones incluidas son educativas y no sustituyen autenticacion, moderacion ni control de abuso para produccion.
