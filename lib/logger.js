const CloudWatchLogger = require('./cloudWatchLogger');
const logger           = new CloudWatchLogger('botkit/botname');

module.exports = logger;