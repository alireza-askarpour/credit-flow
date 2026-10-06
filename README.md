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

Payment submission uses `POST /payments` with the `Idempotency-Key` header.
Reusing the same key with the same payload returns the existing payment
request; reusing it with a different payload returns a conflict. The key is
cached briefly in Redis for contention control, while PostgreSQL remains the
source of truth through its unique constraint.

Payment status and history are available through:

- `GET /payments/:id`
- `GET /payments/:id/events`
- `GET /users/:id/payments?page=1&limit=20&status=QUEUED&reference=...`
- `POST /payments/:id/cancel`

Public payment responses expose only safe failure codes such as
`PAYMENT_BUSINESS_FAILURE` or `PAYMENT_TECHNICAL_FAILURE`; internal failure
messages and event metadata are not returned.

Cancellation is accepted only while a payment is `PENDING` or `QUEUED`. Once
processing has started, the conditional transition fails and the API returns a
conflict.

If a payment row is created but RabbitMQ publishing fails, the API recovery
cron republishes stale `PENDING` requests every 10 seconds. The transition to
`QUEUED` is still conditional, so a later duplicate delivery cannot overwrite a
newer state. The worker should claim `QUEUED` requests through the repository's
conditional `claimForProcessing` method; only one delivery can win, which makes
at-least-once RabbitMQ delivery safe.

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

The worker consumes payment jobs with manual acknowledgements and a configured
prefetch limit. It claims each `QUEUED` payment with a conditional update,
processes the debit and success event in one PostgreSQL transaction, and treats
duplicate or terminal messages as safe no-op acknowledgements. Business
failures such as insufficient balance are acknowledged without retry; technical
failures are classified centrally and requeued until `maxAttempts` is reached.

Technical retry policy is three total attempts with jittered backoff based on
5s, 15s, and 60s intervals. Retry messages go through durable TTL queues and a
dead-letter exchange; after the final attempt the payment is marked `FAILED`
with `TECHNICAL` failure type and published to the payment DLQ. Business
failures are never retried. The retry event stores the attempt number, delay,
and safe error code in its metadata.

Failure simulation is controlled by `PAYMENT_SIMULATION_ENABLED`,
`PAYMENT_SIMULATION_MAX_AMOUNT`, and the optional `PAYMENT_SIMULATION_SEED`.
References containing `FAIL` produce a deterministic business failure with no
retry. References containing `FAIL_TECH` produce a deterministic technical
failure and are retryable. Other payments use
`min(0.9, amount / PAYMENT_SIMULATION_MAX_AMOUNT)` as the probability of a
technical failure. A seed makes this amount-based decision deterministic for
tests.

The database design includes `users`, `payment_requests`, `transactions`, and
`payment_events`. Money is stored as integer PostgreSQL `BIGINT` values in the
configured تومان/ریال unit, user balances have a database-level non-negative
check, and payment idempotency plus one-debit-per-request are enforced with
unique constraints. The seed creates a regular sample user and a low-balance
user for failure-path testing.
