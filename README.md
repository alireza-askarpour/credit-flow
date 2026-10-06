# Credit Flow

Asynchronous user credit payment backend built as a NestJS monorepo.

## Applications

- `apps/api` — HTTP API, admin reports, and RabbitMQ job publisher.
- `apps/worker` — RabbitMQ consumer and payment-processing worker.
- `libs/prisma` — shared Prisma client service and database schema.
- `libs/common` — shared DTOs, enums, queue contracts, domain errors, and state machines.
- `libs/redis` — shared Redis module and service.
- `libs/messaging` — RabbitMQ topology and publisher helpers.
- `libs/config` — validated environment configuration.
- `libs/health` — API and worker health checks for PostgreSQL, Redis, and RabbitMQ.

## Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev:api
npm run start:dev:worker
```

The API listens on `APP_PORT` (default `3000`) and the worker exposes its health
endpoint on `WORKER_PORT` (default `3001`). Health checks are available at
`/health` on both processes.

The API and worker intentionally share PostgreSQL in this scope: both processes
operate on the same payment state and need transactional consistency. Splitting
the database would add distributed coordination and data replication concerns
without improving the MVP boundary.

Run the full local stack with:

```bash
docker compose up --build
```

The worker and API both enable Nest shutdown hooks. Redis and RabbitMQ clients
close during shutdown so the worker can stop accepting work before its process
exits.

The database design includes `users`, `payment_requests`, `transactions`, and
`payment_events`. Money is stored as integer PostgreSQL `BIGINT` values in the
configured تومان/ریال unit, user balances have a database-level non-negative
check, and payment idempotency plus one-debit-per-request are enforced with
unique constraints. The seed creates a regular sample user and a low-balance
user for failure-path testing.
