import { createPinoTransport } from '@app/config';

export const createWorkerPinoConfig = (
  environment: { app: { mode: string }; logging: { level: string } },
) => ({
  level: environment.logging.level,
  transport: createPinoTransport(environment.app.mode),
});
