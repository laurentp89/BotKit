const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
var sdk = require("./lib/sdk");
const logger = require("./lib/logger");

const botId = process.env.BOT_ID;
const botName = process.env.BOT_NAME;


module.exports = {
    botId,
    botName,

    on_user_message: function (requestId, data, callback) {
        console.log("on_user_message");
        return sdk.sendBotMessage(data, callback);
    },
    on_bot_message: function (requestId, data, callback) {
        console.log("on_bot_message");
        if (data.message === "hello") {
            data.message = "The Bot says hello!";
        }
        //Sends back the message to user

        return sdk.sendUserMessage(data, callback);
    },
    on_agent_transfer: function (requestId, data, callback) {
        return callback(null, data);
    },
    on_event: function (requestId, data, callback) {
        console.log("on_event -->  Event : ", data.event);
        return callback(null, data);
    },
    on_alert: function (requestId, data, callback) {
        console.log("on_alert -->  : ", data, data.message);
        return sdk.sendAlertMessage(data, callback);
    },
    on_webhook: async (requestId, payload, componentId, callback) => {
        // console.log("on_webhook -->  : ", requestId, payload, componentId);
        if (componentId === "Hook0001") {
            console.log("HOOK1");
            return callback(null, payload) // Devuelve el control al bot en XO
        }
    },
};
