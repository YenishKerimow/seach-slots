# search-slots

search-slots monorepo.

## Stack

| Layer      | Tech                                                  |
| ---------- | ----------------------------------------------------- |
| Backend    | NestJS 11, GraphQL (code-first, Apollo), Prisma 6     |
| Scraping   | Puppeteer 24                                          |
| Database   | PostgreSQL 16 (via Docker Compose)                    |
| Admin UI   | React 19 + Vite + TypeScript, Apollo Client           |
| Monorepo   | npm workspaces (`backend/`, `admin/`)                 |

## Layout

```
search-slots/
├── docker-compose.yml      # Postgres
├── .env                    # shared env (Postgres + DATABASE_URL)
├── backend/                # NestJS + GraphQL + Prisma + Puppeteer
│   ├── prisma/schema.prisma
│   └── src/
│       ├── prisma/         # PrismaModule / PrismaService
│       ├── search-slot/    # code-first GraphQL model, resolver, service
│       └── scraper/        # Puppeteer service
└── admin/                  # React admin (Vite) + Apollo Client
```

## Getting started

### Option A — everything in Docker (DB + backend + admin)

```bash
docker compose up -d --build
```

| Service  | URL                              |
| -------- | -------------------------------- |
| Admin    | http://localhost:8080            |
| GraphQL  | http://localhost:3000/graphql    |
| Postgres | localhost:5440                   |

The backend runs `prisma migrate deploy` on startup, so the schema is created
automatically. Stop everything with `docker compose down` (add `-v` to also drop
the database volume).

### Option B — local dev (DB in Docker, apps on host)

```bash
# 1. install everything (from repo root)
npm install

# 2. start Postgres only
npm run db:up

# 3. create the DB schema
npm run prisma:migrate      # or: cd backend && npx prisma migrate dev

# 4. run backend + admin (in two terminals)
npm run dev:backend         # http://localhost:3000/graphql
npm run dev:admin           # http://localhost:5173
```

### Ports & env

Defaults live in `.env` (copy from `.env.example`). Override any of
`POSTGRES_PORT` (host, default 5440), `BACKEND_PORT` (3000), `ADMIN_PORT` (8080).
Inside Compose the backend reaches Postgres at `postgres:5432` (internal); from
your host it's `localhost:5440`.

## Root scripts

| Script                    | Purpose                            |
| ------------------------- | ---------------------------------- |
| `npm run dev:backend`     | NestJS in watch mode               |
| `npm run dev:admin`       | Vite dev server                    |
| `npm run build`           | Build backend + admin              |
| `npm run db:up`           | Start Postgres container only      |
| `npm run db:down`         | Stop containers                    |
| `npm run prisma:migrate`  | Run Prisma migrations              |
| `docker compose up -d --build` | Build & run the whole stack   |

## Slot scraper

A background worker (`backend/src/scheduler`) runs **every 30 seconds**:

1. Reuses an already-open headless Chrome if one is available, otherwise
   launches a new one (`PuppeterService`).
2. Keeps **6 calendar tabs** open — one per appointment type × the current and
   next month (max one month ahead):
   | Type    | Calendar |
   | ------- | -------- |
   | USUAL   | `/calendar/11` |
   | VIP     | `/calendar/12` |
   | STUDENT | `/calendar/20` |
   e.g. `…/calendar/11?month=2026-08` and `…/calendar/11?month=2026-09`.
3. Parses each `table.table-bordered` slot table and collects every day that is
   **Available** with `data-remaining > 0`.
4. Matches those against `INPROGRESS` searchings (by type + date); each match is
   marked **FOUND** and a message is sent to Telegram.

Telegram is configured via `BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`. If they
are empty the scraper still runs; it just logs instead of sending.

## Ticket search (ASB → IST flights)

Admin section **«Поиск билетов»** creates one `TicketSearching` per day of a
date range with a class: `ECONOMY`, `BUSINESS` or `BOTH` (editable per row).

`backend/src/ticket-scraper`:

1. **Enqueue cron** (every 30 s) puts one BullMQ job per `INPROGRESS` or
   `FOUND` searching whose date is today or later (Ashgabat time). The searching id is
   the job id, so a day already waiting or running is not queued twice.
2. **Worker** (`ticket-search` queue, concurrency **50**) GETs
   `https://turkmenistanairlinestr.com/en-US/SearchResult/ASB/IST/DD.MM.YYYY/-/0/0/1/0/0/1`
   with a random User-Agent and parses every `div.result-box` → flight number,
   date, departure/arrival time, cabin. Fares that differ only by price are
   merged. Flights matching the searching's class mark it **FOUND** (current
   flights are saved to `foundFlights`). A FOUND searching **keeps being
   checked** until the user cancels or deletes it: Telegram is notified on every
   check that finds matching flights, and if the tickets disappear it goes back
   to INPROGRESS.
3. **Expire cron** (every 10 min) marks `INPROGRESS` searchings whose date has
   passed as **NOT_FOUND**.

Redis is required for the queue (`REDIS_HOST` / `REDIS_PORT`, Compose service
`redis`, host port 6390).

## Notes

- **Rolldown native binding:** the admin pins `@rolldown/binding-*` packages in
  `optionalDependencies` as a workaround for an npm bug that skips transitive
  optional platform binaries under workspaces. Add your platform's binding there
  if you're on an OS/arch not already listed.
- Copy `.env.example` → `.env` (root) and `admin/.env.example` → `admin/.env` if
  you need to override defaults.
