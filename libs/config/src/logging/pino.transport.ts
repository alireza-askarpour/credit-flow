import { isEqual } from '@app/common';

export interface PinoTransportConfig {
  target: string;
  options: {
    colorize: boolean;
    singleLine: boolean;
    translateTime: string;
    ignore: string;
  };
}

export const createPinoTransport = (
  mode: string,
): PinoTransportConfig | undefined =>
  isEqual(mode, 'production')
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };
