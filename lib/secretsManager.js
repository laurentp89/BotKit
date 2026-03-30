
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const logger    = require("./logger");

let region = process.env.AWS_REGION;
let secretName = process.env.SECRETID;
let secrets;

const client = new SecretsManagerClient({ region: region });

async function getAWSAccessCredentials() {
    try{
        logger.info("Cargando credenciales de Secret Manager")
        const command = new GetSecretValueCommand({
            SecretId: secretName
        });
        const data = await client.send(command);
        if (data.SecretString) {
            secrets = JSON.parse(data.SecretString);
            for (const envKey of Object.keys(secrets)) {
                process.env[envKey] = secrets[envKey];
                logger.info(`✔ Se cargó ${envKey} a las variables de ambiente`)
            }
            logger.info("✅ Datos cargados correctamente desde Secrets Manager");
        }
    } catch (err) {
        logger.error("‼️ Error al cargar datos de Secrets Manager.", {err})
        logger.error(JSON.stringify({
            AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
            AWS_SESSION_TOKEN: !!process.env.AWS_SESSION_TOKEN,
            AWS_REGION: process.env.AWS_REGION
        }))
    }
}

module.exports = getAWSAccessCredentials;