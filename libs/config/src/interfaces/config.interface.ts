export interface EnvironmentVariables {
  app: {
    id: string;
    port: number;
    mode: string;
    domain?: string;
    api_prefix: string;
    cors_origins: string[];
  };
  worker: {
    port: number;
  };
  db: {
    url: string;
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    name?: string;
  };
  redis: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
  logging: {
    level: string;
  };
}
