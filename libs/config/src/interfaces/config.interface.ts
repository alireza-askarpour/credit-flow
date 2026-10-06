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
    id: string;
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
  simulation: {
    enabled: boolean;
    max_amount: number;
    seed?: string;
  };
}
