export interface EnvironmentVariables {
  app: {
    id: string;
    port: number;
    mode: string;
    domain?: string;
    api_prefix: string;
    cors_origins: string[];
    swagger_enabled: boolean;
    swagger_path: string;
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
  admin: {
    api_key: string;
  };
  simulation: {
    enabled: boolean;
    max_amount: number;
    seed?: string;
  };
}
