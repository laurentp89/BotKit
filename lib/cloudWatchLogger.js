const {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");
const logger = require("./logger");
const { normalizedBotName } = require('./../starter.js')

class CloudWatchLogger {
  constructor() {
    this.logGroupName = `/botkit/${normalizedBotName}`;
    this.currentDate = this.getCurrentDateString();
    this.logStreamName = `${normalizedBotName}-${this.currentDate}`;

    this.cloudwatch = new CloudWatchLogsClient({ region: process.env.AWS_REGION });
    this.sequenceToken = null;
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  getCurrentDateString() {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }

  async initialize() {
    try {
      try {
        // crear logGroup si no existe
        const command = new CreateLogGroupCommand({ logGroupName: this.logGroupName });
        await this.cloudwatch.send(command);
      } catch (err) {
        if (err.name !== "ResourceAlreadyExistsException") {
          // Log group creation error - continue initialization
          console.warn(`Error al crear log group en Cloudwatch ${err}`);
        } else {
          console.info("Log group ya existe.")
        }
      }

      try {
        // crear logStream si no existe
        const command = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        });
        await this.cloudwatch.send(command);
      } catch (err) {
        if (err.name !== "ResourceAlreadyExistsException") {
          // Log stream creation error - continue initialization
          console.error(`Error creando --- Stream ${err.name}`);
        } else {
          console.info("Stream ya existe.")

        }
      }

      this.initialized = true;
    } catch (err) {
      console.error(`Error creando logger ${err}`);
    }
  }

  async switchToNewDayStream(newDate) {
    // cambiar al nuevo logStream del día
    try {
      this.currentDate = newDate;
      this.logStreamName = `${normalizedBotName}-${newDate}`;
      this.sequenceToken = null;

      try {
        const command = new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        });
        await this.cloudwatch.send(command);
      } catch (err) {
        if (err !== "ResourceAlreadyExistsException") {
          console.error(`Error creando Stream ${err}`);
        } else {
          logger.info("Stream ya existe.")
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  async log(level, message, metadata = {}) {
    // función para generar bitácoras
    await this.initPromise;

    const today = this.getCurrentDateString(); // para timestamp en consola
    if (today !== this.currentDate) {
      await this.switchToNewDayStream(today);
    }

    const logMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Local console output
    const consoleOutput = `[${logMessage.timestamp}] [${level}] ${message}`;
    if (Object.keys(metadata).length > 0) {
      console.log(consoleOutput, metadata);
    } else {
      console.log(consoleOutput);
    }
    if (!this.initialized) {
      return;
    }

    try {
      const params = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [
          {
            message: JSON.stringify(logMessage),
            timestamp: Date.now(),
          },
        ],
      };

      if (this.sequenceToken) {
        params.sequenceToken = this.sequenceToken;
      }

      const command = new PutLogEventsCommand(params);
      const response = await this.cloudwatch.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (err) {
      // Error sending logs to CloudWatch - will retry on next call
      if (err.name === "InvalidSequenceTokenException") {
        this.sequenceToken = null;
      }
    }
  }

  async info(message, metadata = {}) {
    return this.log("INFO", message, metadata);
  }

  async error(message, metadata = {}) {
    return this.log("ERROR", message, metadata);
  }

  async warn(message, metadata = {}) {
    return this.log("WARN", message, metadata);
  }

  async debug(message, metadata = {}) {
    return this.log("DEBUG", message, metadata);
  }
}

module.exports = CloudWatchLogger;
