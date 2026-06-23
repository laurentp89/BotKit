/* Archivo principal del Botkit. Aquí registramos los módulos que va a requerir el bot para funcionar
por medio de
sdk.registerBot(require('./starter.js'));
También aquí instaciamos la aplicación y el servidor.
*/
try {
  require("dotenv").config();
} catch (e) {}

try {

  const fs = require('fs');
  if (fs.existsSync('/etc/environment')) {
    const envContent = fs.readFileSync('/etc/environment', 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && !process.env[key]) {
          process.env[key] = value.replace(/^"|"$/g, '');
        }
      }
    });
  }
} catch (err) {
  console.error("NO FS")
}


try {
  var Application = require("./lib/app");
  var Server = require("./lib/server");
  var sdk = require("./lib/sdk");
  var config = require("./config");
  const loadParameters = require("./lib/parameterStore");
  const getAWSAccessCredentials = require("./lib/secretsManager");
  const logger = require("./lib/logger");

  var app = new Application(null, config);
  var server = new Server(config, app);

  (async () => {
    await logger.info("Iniciando app...");

    await loadParameters();

    await logger.info("Cargando credenciales...");
    await getAWSAccessCredentials();

    await logger.info("Iniciando servidor...");
    await server.start();
    await logger.info("✅ Servidor iniciado.");

    await logger.info("Registrando bot...");
    try {
      sdk.registerBot(require("./starter.js"));
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
    logger.info("✅ Bot registrado.");

    logger.info("🚀 Botkit listo para recibir solicitudes.");
  })().catch((err) => {
    logger.error("Error iniciando app:");
    logger.error(err instanceof Error ? err.stack : JSON.stringify(err));
    process.exit(1);
  });
} catch (err) {
  console.error("ERROR, no se pudo iniciar la app:");
  console.error(err);
  process.exit(1);
}
