# Finance Dashboard — Backend

A role-based finance dashboard backend built with NestJS, Prisma, BullMQ, and Redis inside a Turborepo monorepo.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Packages](#packages)
- [Apps](#apps)
- [Modules](#modules)
- [Auth Flow](#auth-flow)
- [Role Based Access](#role-based-access)
- [Queue & Audit Logging](#queue--audit-logging)
- [Idempotency](#idempotency)
- [Rate Limiting](#rate-limiting)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)

---

## Project Structure

```
internship/
├── apps/
│   └── api/                        # NestJS backend
│       └── src/
│           ├── modules/
│           │   ├── auth/           # Authentication module
│           │   ├── dashboard/      # Dashboard summary module
│           │   └── financial-records/ # Records + categories module
│           ├── common/             # Shared middleware and configs
│           ├── app.module.ts       # Root module
│           └── main.ts             # Entry point
├── packages/
│   ├── database/                   # Prisma client (@repo/database)
│   └── queue/                      # Redis client (@repo/queue)
└── package.json                    # Monorepo root
```

---

## Architecture Overview

```
Client
  │
  ▼
NestJS API (apps/api)
  │
  ├── Auth Module         → Google OAuth + OTP + JWT
  ├── Dashboard Module    → Summary, trends, category breakdown
  └── Financial Records   → CRUD + role guard + audit queue
          │
          ├── Postgres (via @repo/database / Prisma)
          └── Redis + BullMQ (via @repo/queue)
                  │
                  └── Audit Worker → writes AuditLog to Postgres
```

---

## Packages

### `packages/database` → `@repo/database`

Shared Prisma client used across all apps. Import the `prisma` instance directly — no `PrismaService` injection needed.

```typescript
import { prisma } from "@repo/database";

await prisma.user.findUnique({ where: { id } });
```

**Schema models**: `User`, `FinancialRecord`, `Category`, `AuditLog`, `IdempotencyKey`

---

### `packages/queue` → `@repo/queue`

Shared Redis client powered by `ioredis`. Connects via `REDIS_URL`. Exports:

| Export              | Description                      |
| ------------------- | -------------------------------- |
| `getRedisClient()`  | Returns singleton Redis instance |
| `connectRedis()`    | Explicitly connects the client   |
| `disconnectRedis()` | Gracefully disconnects           |

```typescript
import { getRedisClient } from "@repo/queue";
```

> Build required before use: `cd packages/queue && yarn build`

---

## Apps

### `apps/api`

The main NestJS backend. Runs on `PORT` from `.env` (default `3000`).

```
src/
├── modules/
│   ├── auth/
│   │   ├── services/
│   │   │   └── otp.service.ts         # OTP generation + hashing
│   │   ├── auth.service.ts            # Core auth logic
│   │   ├── auth.controller.ts         # Auth routes
│   │   ├── auth.module.ts
│   │   ├── google.strategy.ts         # Passport Google OAuth strategy
│   │   ├── google.guard.ts            # Google auth guard
│   │   ├── jwt.strategy.ts            # Passport JWT strategy
│   │   ├── jwt.guard.ts               # JWT auth guard
│   │   ├── roles.guard.ts             # Role based access guard
│   │   └── roles.decorator.ts         # @Roles() decorator
│   │
│   ├── dashboard/
│   │   ├── dashboard.service.ts       # Aggregation logic
│   │   ├── dashboard.controller.ts    # Dashboard routes
│   │   └── dashboard.module.ts
│   │
│   └── financial-records/
│       ├── dto/
│       │   ├── create-record.dto.ts
│       │   ├── update-record.dto.ts
│       │   └── filter-records.dto.ts
│       ├── services/
│       │   ├── financial-records.service.ts  # CRUD logic
│       │   ├── categories.service.ts         # Category management
│       │   ├── audit.queue.ts                # BullMQ queue instance
│       │   └── audit.worker.ts               # BullMQ worker
│       ├── financial-records.controller.ts
│       └── financial-records.module.ts
│
├── common/
│   ├── idempotency.middleware.ts      # Idempotency key middleware
│   └── throttler.config.ts           # Rate limiting config
│
├── app.module.ts                      # Root module — registers all modules + global guards
└── main.ts                            # Bootstrap + global pipes + CORS
```

---

## Modules

### Auth Module

Handles Google OAuth login, OTP verification, and JWT access/refresh token lifecycle.

| File                 | Responsibility                                                  |
| -------------------- | --------------------------------------------------------------- |
| `google.strategy.ts` | Extracts name + email from Google profile                       |
| `google.guard.ts`    | Passes `role` via OAuth state param                             |
| `jwt.strategy.ts`    | Validates Bearer token, checks `tokenType: 'access'`            |
| `jwt.guard.ts`       | Protects routes requiring authentication                        |
| `roles.guard.ts`     | Checks `user.role` against `@Roles()` metadata                  |
| `roles.decorator.ts` | Attaches allowed roles metadata to route handlers               |
| `auth.service.ts`    | Upserts user on Google login, issues temp/access/refresh tokens |
| `otp.service.ts`     | Generates 6-digit OTP, bcrypt hashes it, sets 5min expiry       |

---

### Dashboard Module

All routes are JWT protected. Data is scoped to the requesting user via `req.user.sub`.

| File                      | Responsibility                                                             |
| ------------------------- | -------------------------------------------------------------------------- |
| `dashboard.service.ts`    | Summary totals, category breakdown, recent activity, monthly/weekly trends |
| `dashboard.controller.ts` | Exposes dashboard endpoints                                                |

---

### Financial Records Module

Full CRUD with soft delete, restore, filtering, category management, and async audit logging via BullMQ.

| File                           | Responsibility                                                    |
| ------------------------------ | ----------------------------------------------------------------- |
| `financial-records.service.ts` | CRUD + role scoping + fires audit queue jobs                      |
| `categories.service.ts`        | Create, list, delete categories                                   |
| `audit.queue.ts`               | BullMQ Queue instance connected via `@repo/queue` Redis client    |
| `audit.worker.ts`              | BullMQ Worker — writes `AuditLog` rows to Postgres asynchronously |
| DTOs                           | Input validation via `class-validator`                            |

---

## Auth Flow

```
1. GET /auth/google?role=ADMIN
       │
       ▼
2. Google OAuth callback → upsert user → generate OTP → send OTP email
       │
       ▼
3. POST /auth/verify-otp { token, otp }
       │
       ├── validates temp JWT
       ├── compares OTP hash
       ├── issues accessToken (60m) + refreshToken (30d)
       └── sets refreshToken as httpOnly cookie on /auth/refresh
       │
       ▼
4. POST /auth/refresh (cookie: refreshToken)
       │
       ├── verifies refresh JWT
       ├── compares stored hash
       └── returns new accessToken
```

---

## Role Based Access

| Role      | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| `VIEWER`  | Read-only access to records and dashboard                                |
| `ANALYST` | Read + create + update records                                           |
| `ADMIN`   | Full access — delete, restore, manage categories, see all users' records |

Guards applied: `JwtAuthGuard` (authentication) + `RolesGuard` (authorization).

```typescript
@Roles(Role.ADMIN, Role.ANALYST)
@UseGuards(JwtAuthGuard, RolesGuard)
@Post()
create() {}
```

---

## Queue & Audit Logging

Every mutation on a `FinancialRecord` (create, update, delete, restore) fires a non-blocking BullMQ job:

```
financialRecords.service → auditQueue.add() → [non-blocking, returns to user]
                                    │
                                    ▼
                            auditWorker picks up job
                                    │
                                    ▼
                            prisma.auditLog.create()
```

The `snapshot` field stores the full record state at time of action — giving a complete, diffable history.

---

## Idempotency

All mutating routes (`POST`, `PATCH`, `DELETE`) support idempotency via the `Idempotency-Key` header.

```
Client sends: Idempotency-Key: <uuid>

First request  → executes normally, caches response for 24hrs
Second request → returns cached response immediately, no re-execution
```

Implemented as a global middleware in `common/idempotency.middleware.ts`. Keys are stored in the `IdempotencyKey` Prisma model.

---

## Rate Limiting

Applied globally via `@nestjs/throttler`:

| Window   | Limit        |
| -------- | ------------ |
| 1 second | 5 requests   |
| 1 minute | 100 requests |

Configured in `common/throttler.config.ts` and registered in `app.module.ts` via `APP_GUARD`.

---

## API Reference

### Auth

| Method | Route                     | Description            | Auth     |
| ------ | ------------------------- | ---------------------- | -------- |
| GET    | `/auth/google?role=ADMIN` | Initiate Google OAuth  | None     |
| GET    | `/auth/google/callback`   | OAuth callback         | None     |
| POST   | `/auth/verify-otp`        | Verify OTP, get tokens | Temp JWT |
| POST   | `/auth/refresh`           | Refresh access token   | Cookie   |

### Dashboard

All routes require `Authorization: Bearer <accessToken>`

| Method | Route                       | Description                         |
| ------ | --------------------------- | ----------------------------------- |
| GET    | `/dashboard/summary`        | Total income, expenses, net balance |
| GET    | `/dashboard/categories`     | Per-category breakdown              |
| GET    | `/dashboard/recent`         | Last 10 transactions                |
| GET    | `/dashboard/trends/monthly` | Month-wise income vs expense        |
| GET    | `/dashboard/trends/weekly`  | Last 7 days daily breakdown         |

### Financial Records

| Method | Route                               | VIEWER | ANALYST | ADMIN |
| ------ | ----------------------------------- | ------ | ------- | ----- |
| GET    | `/financial-records`                | ✅     | ✅      | ✅    |
| GET    | `/financial-records/:id`            | ✅     | ✅      | ✅    |
| POST   | `/financial-records`                | ❌     | ✅      | ✅    |
| PATCH  | `/financial-records/:id`            | ❌     | ✅      | ✅    |
| DELETE | `/financial-records/:id`            | ❌     | ❌      | ✅    |
| PATCH  | `/financial-records/:id/restore`    | ❌     | ❌      | ✅    |
| GET    | `/financial-records/categories`     | ✅     | ✅      | ✅    |
| POST   | `/financial-records/categories`     | ❌     | ❌      | ✅    |
| DELETE | `/financial-records/categories/:id` | ❌     | ❌      | ✅    |

**Query filters for `GET /financial-records`:**

| Param        | Type                  | Description           |
| ------------ | --------------------- | --------------------- |
| `type`       | `INCOME` \| `EXPENSE` | Filter by record type |
| `categoryId` | `string`              | Filter by category    |
| `from`       | `ISO date string`     | Date range start      |
| `to`         | `ISO date string`     | Date range end        |

---

## Environment Variables

```env
# Database
DATABASE_URL=your_database_url

# Redis
REDIS_URL=your_redis_url

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# App
PORT=3000
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis (or Docker)

### 1. Clone and install

```bash
git clone <repo-url>
cd internship
yarn
```

### 2. Start Redis

```bash
docker run -d -p 6379:6379 redis
```

### 3. Set up environment

```bash
cp apps/api/.env.example apps/api/.env
# fill in the values
```

### 4. Build shared packages

```bash
cd packages/database && yarn build
cd ../queue && yarn build
cd ../..
```

### 5. Run migrations

```bash
cd packages/database
npx prisma migrate dev
```

### 6. Start the API

```bash
cd apps/api
yarn start:dev
```

API runs at `http://localhost:3000`

---

## Assumptions

- Google OAuth is the only login method — no email/password auth
- Roles are assigned at registration time via the `role` query param on the OAuth flow
- Soft deleted records are excluded from all dashboard aggregations
- ADMIN sees all users' records; VIEWER and ANALYST only see their own
- Idempotency keys expire after 24 hours
- Audit log snapshots store the full record state — no diffing required to reconstruct history
