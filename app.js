/* Archivo principal del Botkit. Aquí registramos los módulos que va a requerir el bot para funcionar
por medio de
sdk.registerBot(require('./starter.js'));
También aquí instaciamos la aplicación y el servidor.
*/

var Application = require("./lib/app");
var Server      = require("./lib/server");
var sdk         = require("./lib/sdk");
var config       = require("./config");

var app    = new Application(null, config);
var server = new Server(config, app);

sdk.checkNodeVersion();

server.start();

sdk.registerBot(require('./starter.js'));
