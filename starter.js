const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
var sdk = require("./lib/sdk");
const logger = require("./lib/logger");

const botId = process.env.BOT_ID;
const botName = process.env.BOT_NAME;
const bucket = process.env.BUCKET_NAME


async function blacklistPhoneNumber(phoneNumber, callback) {
    try {
        const RedisClient = require("./lib/RedisClient");
        const redisClient = RedisClient.createClient({}, "botkit_redis");

        redisClient.set(phoneNumber, 'freeze', 'EX', 15 * 60) // 15 min

    } catch (err) {
        logger.error("Error al guardar datos en Redis", {
            error: err.message,
            phoneNumber: phoneNumber,
        });
        if (callback) callback(err, null);
    }
}

async function saveLogToRedis(phoneNumber, content, callback) {
    try {
        const RedisClient = require("./lib/RedisClient");
        const redisClient = RedisClient.createClient({}, "botkit_redis");
        const key = `log:${phoneNumber}`;
        const dataToSave = JSON.stringify({ ...content, timestamp: new Date().toISOString() });

        redisClient.rpush(key, dataToSave, (err, reply) => {
            if (err) {
                logger.error("Error al guardar datos en Redis", {
                    error: err.message,
                    phoneNumber: phoneNumber,
                });
                if (callback) callback(err, null);
            } else {
                redisClient.expire(key, 2 * 60 * 60); // 2 horas
                if (callback) callback(null, reply);
            }
        });
    } catch (err) {
        logger.error("Error al guardar datos en Redis", {
            error: err.message,
            phoneNumber: phoneNumber,
        });
        if (callback) callback(err, null);
    }
}

function recoverLogsFromRedis(phoneNumber) {
    console.log("Recovering logs")
    return new Promise((resolve, reject) => {
        try {
            const RedisClient = require("./lib/RedisClient");
            const redisClient = RedisClient.createClient({}, "botkit_redis");
            const key = `log:${phoneNumber}`;

            redisClient.lrange(key, -14, -1, (err, data) => {
                if (err) reject(err);
                else resolve(data ? data.map(item => JSON.parse(item)) : null);
            });
        } catch (err) {
            reject(err);
        }
    });
}

function deleteRedisKey(key, callback) {
    try {
        const RedisClient = require("./lib/RedisClient");
        const redisClient = RedisClient.createClient({}, "botkit_redis");

        logger.debug("Eliminando llave de Redis", { key });
        redisClient.del(key, (err, reply) => {
            if (err) {
                logger.error("Error al eliminar llave en Redis", {
                    error: err.message,
                    key,
                });
                if (callback) callback(err, null);
                return;
            }
            logger.info("llave eliminada de Redis", { key, reply });
            if (callback) callback(null, reply);
        });
    } catch (err) {
        logger.error("Error al eliminar llave en Redis", {
            error: err.message,
            key,
        });
        if (callback) callback(err, null);
    }
}


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

            console.log("HOOK1")
            await sdk.saveData(requestId, payload);
            let savedPayload = await sdk.getSavedData(requestId);
            const sessionId = savedPayload.context.session.BotUserSession.conversationSessionId;
            const lastMessage = savedPayload.context.session.BotUserSession.lastMessage.messagePayload.message.body;
            saveLogToRedis(sessionId, {"lastMessage": lastMessage}, (err, result) => {
                if (err) logger.error("Error guardando en Redis:", { err });
            });

            return callback(null, savedPayload);
        }
        if (componentId === "Hook0002") {

            console.log("HOOK2")
            const sessionId = payload.context.session.BotUserSession.conversationSessionId;
            const conversationData = await recoverLogsFromRedis(sessionId);

            if (conversationData) {

                console.log("RECUPERADO")
                const s3 = new S3Client({ region: 'us-east-1' });

                s3.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: `logs/${sessionId}/${Date.now()}.json`,
                    Body: JSON.stringify(conversationData),
                    ContentType: 'application/json',
                }));
                return callback(null, payload)
            };

        }

        if (componentId === "Hook0003") {
            console.log("HOOK3");
            blacklistPhoneNumber("5513532232", (err, result) => {
                if (err) logger.error("ERROR", {err});
            });
        }

        if (componentId === "TESTHOOK") {
            console.log("TESTHOOK");
            return callback(null, savedPayload);
        }
    },
};
