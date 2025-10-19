import pino from 'pino';
import { config } from '@/config/config';

const logger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: config.SERVICE_NAME,
    environment: config.NODE_ENV,
  },
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      }
    }
  }),
  ...(config.NODE_ENV === 'production' && {
    formatters: {
      level: (label) => ({ level: label }),
    },
  }),
});

export { logger };