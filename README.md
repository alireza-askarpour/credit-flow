# Credit Flow

Asynchronous user-credit payment backend built with NestJS, PostgreSQL, Prisma,
Redis and RabbitMQ.

## Install and run

### Local

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Run the API and worker in separate terminals:

```bash
npm run start:dev:api
npm run start:dev:worker
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Worker health: `http://localhost:3001/health`

### Docker

```bash
docker compose up --build
```

Docker starts PostgreSQL, Redis and RabbitMQ, applies Prisma migrations, then
starts the API and worker. The stack contains:

- API: `http://localhost:3000`
- Worker health: `http://localhost:3001/health`
- Swagger: `http://localhost:3000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ AMQP: `localhost:5672`
- RabbitMQ Management UI: `http://localhost:15672`

Useful commands:

```bash
docker compose logs -f api worker
docker compose ps
docker compose down
```

If your system only provides the legacy Compose binary, use
`docker-compose` instead of `docker compose`.

## Admin API authentication

Every `/admin/*` request requires this header:

```http
x-admin-api-key: change-me-to-a-long-random-secret
```

The value must match `ADMIN_API_KEY` in `.env` or `docker-compose.yml`.

Example:

```bash
curl http://localhost:3000/admin/users \
  -H "x-admin-api-key: change-me-to-a-long-random-secret"
```

## Payment testing

### Simulation mode: test failures

Set these variables in `.env` and restart both API and worker:

```env
PAYMENT_SIMULATION_ENABLED=true
PAYMENT_SIMULATION_MAX_AMOUNT=1000000
PAYMENT_SIMULATION_SEED=test-seed
```

Behavior:

- Reference containing `FAIL_TECH`: deterministic technical failure, retryable.
- Reference containing `FAIL`: deterministic business failure, not retryable.
- Other references: amount-based technical failure probability:
  `min(0.9, amount / PAYMENT_SIMULATION_MAX_AMOUNT)`.

Technical failures are retried according to the configured retry policy. Business
failures such as insufficient balance are marked failed without retry.

### Normal mode: test success

```env
PAYMENT_SIMULATION_ENABLED=false
```

Restart the API and worker, then submit a payment for a user with enough balance.
Use a reference that does not contain `FAIL`. The worker atomically deducts the
balance, records a `DEBIT` transaction and marks the payment `SUCCEEDED`.

## Pagination and `filterString`

Paginated APIs use:

```text
page=1&limit=20&filterString=...&sortString=...
```

Filter format:

```text
field:operator:value;field:operator:value
```

Supported operators and examples:

| Operator | Example |
|---|---|
| `eq` | `status:eq:FAILED` |
| `neq` | `status:neq:PENDING` |
| `gt` | `amount:gt:10000` |
| `gte` | `amount:gte:10000` |
| `lt` | `amount:lt:500000` |
| `lte` | `amount:lte:500000` |
| `between` | `amount:between:10000,500000` |
| `like` | `reference:like:ORDER` |
| `iLike` | `reference:iLike:order` |
| `notLike` | `reference:notLike:TEST` |
| `contains` | `reference:contains:ORDER` |
| `startsWith` | `reference:startsWith:INV` |
| `endsWith` | `reference:endsWith:2026` |
| `in` | `status:in:PENDING,QUEUED` |
| `notIn` | `status:notIn:FAILED,CANCELLED` |
| `isNull` | `failureReason:isNull:true` |
| `isNotNull` | `completedAt:isNotNull:true` |
| `exists` | `failureReason:exists:true` |
| `notExists` | `failureReason:notExists:true` |

Example:

```http
GET /users/{userId}/payments?page=1&limit=20&filterString=status:eq:FAILED;amount:gte:10000&sortString=createdAt:desc
```

Sorting supports multiple fields:

```text
sortString=createdAt:desc;amount:asc
```

Filter fields are validated per model. Money amounts are integer تومان/ریال
values, not floating-point values.
