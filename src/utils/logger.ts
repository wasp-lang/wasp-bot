import winston from "winston";

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.errors({ stack: true }),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
