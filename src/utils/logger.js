/**
 * Simple formatted console logger with timestamps and log levels
 */
const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}] ${message}`, ...args];
};

const logger = {
  info: (message, ...args) => {
    console.log(...formatMessage('INFO', message, ...args));
  },
  warn: (message, ...args) => {
    console.warn(...formatMessage('WARN', message, ...args));
  },
  error: (message, ...args) => {
    console.error(...formatMessage('ERROR', message, ...args));
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...formatMessage('DEBUG', message, ...args));
    }
  }
};

module.exports = logger;
