import pino, { type Logger } from "pino";

let fixableLog: Logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

export const initializeFixableLogger = (verbose?: boolean) => {
  fixableLog = pino({
    level: verbose ? "debug" : "info",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
};

export const getFixableLogger = (): Logger => {
  return fixableLog;
};
