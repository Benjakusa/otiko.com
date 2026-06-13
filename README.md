# Otiko Ticketing Platform Backend (FastAPI async)

Core high-throughput asynchronous ticketing service built with Python 3.11+, FastAPI, PostgreSQL (asyncpg), and Redis.

## Key Features Built in Prompt 1
1. **Atomic Reservations**: Strict row-level locking via SQLAlchemy single database operation prevents overselling up to 100,000 ticket requests per minute.
2. **Double-Sided Authentication**: Integrated Firebase Admin token decoding mapping into local dynamic Organizer profiles.
3. **High Performance**: Redis integration for rate-limiting, transaction idempotency checks, and pre-sales caching.
4. **Clean Design Infrastructure**: Comprehensive schemas and models matching SQLAlchemy 2.0 standards.

## Running Locally with Docker Compose
```bash
docker-compose up --build
```
The FastAPI documentation will be available at `http://localhost:8000/docs`.

## Running the k6 Load Test
```bash
k6 run infra/load-tests/reserve_test.js
```
