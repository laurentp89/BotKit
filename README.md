# BotKit Telcel

Fork del SDK [BotKit de Kore.ai](https://github.com/Koredotcom/BotKit) para la integración de un bot conversacional con lógica de negocio personalizada. Este despliegue extiende el SDK original con:

- **Integración con AWS** para configuración, secretos y logging: AWS Systems Manager Parameter Store, AWS Secrets Manager y AWS CloudWatch Logs.

## Arquitectura

```
app.js                  # Punto de entrada: carga .env, Parameter Store, Secrets Manager y arranca el servidor
starter.js              # Handler del bot registrado con el SDK (on_user_message, on_bot_message, etc.)
config.json             # Configuración de runtime (puerto, JWT, Redis, idiomas, licencia de live agent)
LiveChat.js             # Lógica de transferencia a agente humano + job programado de polling
LiveChatAPI.js          # Cliente HTTP para la API de livechatinc.com
makeHttpCall.js         # Helper HTTP genérico basado en axios
dataStore.js            # Almacenamiento en memoria de variables del bot

lib/
├── app/                # Aplicación Express: rutas, middlewares, manejo de errores
│   ├── routes.js               # Rutas webhook del SDK + /gethistory
│   └── middlewares/APIKeyMiddleware/  # Autenticación JWT de las peticiones del bot
├── server/              # Arranque del servidor (soporta Node cluster)
├── sdk/                  # SDK core de BotKit (registro de bot, eventos, tipos de datos)
├── RedisClient.js        # Cliente/caché Redis
├── logger.js             # Logger singleton
├── cloudWatchLogger.js   # Logger hacia AWS CloudWatch Logs
├── parameterStore.js     # Carga configuración desde AWS SSM Parameter Store
└── secretsManager.js     # Carga credenciales desde AWS Secrets Manager

views/history/            # UI estática del visor de historial de chat (transferencia a agente)
```

**Flujo de arranque:** `app.js` carga `.env` → obtiene parámetros de AWS SSM Parameter Store → obtiene credenciales de AWS Secrets Manager → inicia el `Server` (con soporte de clustering) → monta la `Application` Express → registra `starter.js` como handler del bot vía `sdk.registerBot()`.

Las peticiones webhook entrantes desde Kore.ai (`POST /sdk/bots/:botId/:eventName`) se autentican con JWT en `APIKeyMiddleware` y se despachan según `lib/sdk/EventMappings.json` hacia los handlers correspondientes en `starter.js` / `LiveChat.js`.

## Requisitos

- Node.js **v22** o superior (`config.json` → `validations.leastNodeVersion`). Se usa LTS.
- Redis (si `config.json` → `redis.available` es `true`)
- Cuenta de AWS con acceso a SSM Parameter Store, Secrets Manager y CloudWatch Logs

## Instalación

```bash
npm install
```

## Configuración

### Variables

El proyecto carga variables desde un archivo `.env` en la raíz (no versionado). Variables requeridas:

| Variable | Descripción |
|---|---|
| `AWS_REGION` / `REGION` | Región de AWS (usada de forma inconsistente entre módulos; definir ambas) |
| `AWS_ACCESS_KEY_ID` | Credencial de acceso a AWS |
| `AWS_SECRET_ACCESS_KEY` | Credencial secreta de AWS |
| `BOT_NAME` | Nombre del bot; se usa para construir la ruta de Parameter Store (`/botkit/<BOT_NAME>`) y los nombres de log group/stream en CloudWatch |
| `BOT_ID` | Identificador del bot (usado en `starter.js`) |
| `SECRET_NAME` | ID del secreto en AWS Secrets Manager a recuperar |
| `API_KEY` / `APP_ID` | Usados por `APIKeyMiddleware` para validar los JWT entrantes |

En desarrollo usamos .env, en producción se cargan las credenciales de AWS a /etc environment
y el resto se cargan de parameter store y de secrets manager. `/botkit/<BOT_NAME>` debe de coincidir con el registro en parameter store.

> **Importante:** nunca subas el archivo `.env` con credenciales reales al repositorio. Si llegaste a enviar credenciales de AWS en algún momento, rótalas de inmediato.

Los parámetros adicionales en la ruta `/botkit/<BOT_NAME>/*` de AWS SSM Parameter Store se inyectan automáticamente (en mayúsculas) en `process.env` al arrancar la aplicación.

### `config.json`

Configuración no sensible versionada en el repositorio:

```json
{
  "server": { "port": 8003 },
  "app": { "apiPrefix": "", "url": "<URL pública de la app>" },
  "validations": { "leastNodeVersion": 22 },
  "jwt": { "jwtAlgorithm": "HS256", "jwt-expiry": 60 },
  "redis": { "options": { "host": "localhost", "port": 6379 }, "available": true },
  "liveagentlicense": "<licencia de LiveChat>",
  "supportsMessageAck": true,
  "languages": ["es"]
}
```

## Uso

### En desarrollo

```bash
node app.js
```

### En producción

```bash
pm2 start --name {nombre} app.js -i 0
```

El servidor levanta en el puerto configurado en `config.json` (`server.port`, por defecto `8003`). Si `config.json` → `server.cluster` es `true`, se ejecuta en modo cluster usando todos los núcleos disponibles.

