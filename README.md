# Credit Flow

Asynchronous user credit payment backend built as a NestJS monorepo.

## Applications

- `apps/api` — HTTP API, admin reports, and RabbitMQ job publisher.
- `apps/worker` — RabbitMQ consumer and payment-processing worker.

## Development

```bash
npm install
npm run start:dev:api
npm run start:dev:worker
```

The API listens on `PORT` (default `3000`). Runtime integration with PostgreSQL,
Redis, and RabbitMQ will be added in the next implementation sections.
