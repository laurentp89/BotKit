const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");
const logger = require("./logger");

const client = new SSMClient({ region: process.env.AWS_REGION });

async function getParametersByPath(path) {
  logger.info("Obteniendo parámetros de AWS Parameter Store");
  const params = {};
  let nextToken;

  do {
    const command = new GetParametersByPathCommand({
      Path: path,
      WithDecryption: true,
      Recursive: true,
      NextToken: nextToken,
    });

    const response = await client.send(command);

    for (const param of response.Parameters) {
      // Strip the path prefix, use just the key name
      const key = param.Name.replace(`${path}/`, "");
      params[key] = param.Value;
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return params;
}

async function loadParameters() {
  logger.info("Cargando parámetros al ambiente...");
  const params = await getParametersByPath("/botkit/sandbox");

  Object.entries(params).forEach(([key, val]) => {
    let keyName = key.toUpperCase();
    process.env[keyName] = val;
    logger.info(`✔  ${key}: ${val}`);
  });
  logger.info("✅ Parámetros cargados correctamente desde Parameter Store");
}

module.exports = loadParameters;
