# Otiko Ticketing Platform

Full-stack event ticketing platform with Firebase Auth, role-based access control, QR ticket scanning, PDF ticket generation, and admin management.

## Architecture

```
otiko.com/
├── server.ts              # Node/Express backend (primary API server)
├── src/                   # React + Vite frontend
├── backend/               # Python FastAPI backend (async)
└── workers/               # Celery workers (PDF generation, email)
```

The **Node/Express server** (`server.ts`) serves both the React frontend (via Vite middleware) and the REST API. It handles ticket booking, QR generation, PDF generation, image upload, payout management, and admin operations with Firebase Auth + Firestore persistence.

The **Python FastAPI backend** (`backend/`) provides supplementary async endpoints for high-throughput reservation locking with PostgreSQL and Redis. The **Celery workers** (`workers/`) handle async PDF generation and email dispatch.

## Features

- **Role-based auth**: Unified login for organizers and admins via Firebase Auth; role (`organizer` | `admin`) stored on the Organizer document
- **Event management**: Create, edit, delete events with image upload (sharp compression)
- **Ticket booking**: Clean white-theme buy flow with per-ticket A4 PDF generation (jsPDF), unique QR codes, and multi-ticket purchase
- **QR ticket scanner**: Camera-based scanning via jsQR with real-time verification; fallback manual entry
- **KYC verification**: PDF-only document upload with pdf-lib compression (3MB limit); KRA PIN collection
- **Payout system**: Wallet balance with reservation, payout request workflow, admin approval/rejection
- **Admin dashboard**: 12-section sidebar (Overview, Organizer Management, Verification, Events, Tickets, Payments, Users, Reports, Notifications, Audit Logs, Settings)
- **Data isolation**: Strict per-organizer scoping on both frontend and backend — no cross-organizer data leakage
- **Dual-mode storage**: Firestore persistence with in-memory cache fallback when Firestore is unavailable

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons |
| Primary Backend | Node.js, Express, tsx |
| Async Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0 |
| Auth | Firebase Auth (email/password + Google sign-in) |
| Database | Firestore (primary), PostgreSQL via SQLAlchemy (async backend) |
| Cache | Redis (async backend rate-limiting, idempotency) |
| Workers | Celery (PDF, email) |
| PDF | jsPDF (programmatic), pdf-lib (compression) |
| QR | qrcode (generation), jsQR (scanning) |
| Images | multer + sharp (upload & compression) |
| Email | Nodemailer / SendGrid |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for async backend)
- A Firebase project with Auth and Firestore enabled

### Installation

```bash
# Install Node dependencies
npm install

# Install Python dependencies (optional — for async backend)
pip install -r backend/requirements.txt
```

### Environment Setup

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Minimum required variables:

| Variable | Description |
|----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase Admin SDK JSON key |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `TICKET_SECRET` | Secret for ticket signing |

See `.env.example` for all configurable variables.

### Running

```bash
# Start the development server (serves frontend + API)
npm run dev
```

The app runs at `http://localhost:3000`.

### Admin Promotion

Promote an organizer to admin:

```bash
npx tsx scripts/set-admin.ts <email>
```

Requires `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`.

## Project Structure

```
otiko.com/
├── server.ts                    # Express API + Vite dev server
├── src/
│   ├── App.tsx                  # Root component with routing, auth guards, sidebar
│   ├── main.tsx                 # React entry point
│   ├── types.ts                 # TypeScript interfaces
│   ├── lib/firebase/auth.ts     # Firebase Auth client
│   ├── pages/
│   │   └── UserDashboard.tsx    # Organizer dashboard
│   └── components/
│       ├── AdminDashboard.tsx   # Full admin panel (12 sections)
│       ├── public-buy-flow.tsx  # Ticket booking flow
│       ├── ticket-scanner-sim.tsx # Camera QR scanner
│       ├── auth/                # Login, Signup, ForgotPassword
│       └── policies/            # Legal pages
├── backend/                     # Python FastAPI async backend
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routers/             # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── schemas/             # Pydantic schemas
│   │   └── middleware/          # Rate limiting, logging
│   ├── tests/                   # Test suite
│   └── requirements.txt
├── workers/                     # Celery async tasks
│   ├── tasks/
│   │   ├── email_tasks.py       # SendGrid email dispatch
│   │   ├── pdf_tasks.py         # PDF generation
│   │   └── sweeper_tasks.py     # Cleanup tasks
│   └── utils/db_session.py      # Database session factory
├── scripts/
│   ├── set-admin.ts             # CLI admin promotion
│   └── dump-organizers.ts       # Debug: list Firestore organizers
├── public/                      # Static assets
├── uploads/                     # Uploaded images (gitignored)
├── assets/                      # Brand assets
├── .env.example                 # Environment variable template
├── docker-compose.yml           # Docker setup for async backend
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript configuration
```

## API Endpoints (Node/Express)

### Authentication
All authenticated endpoints require `Authorization: Bearer <firebase-id-token>`.

### Events
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | List events (all for public, scoped if authenticated) |
| POST | `/api/events` | Create event (organizer) |
| PUT | `/api/events/:id` | Update event (owner only) |
| DELETE | `/api/events/:id` | Delete event (owner only) |

### Tickets & Orders
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tickets/reserve` | Reserve tickets (atomic) |
| POST | `/api/tickets/confirm` | Confirm purchase |
| POST | `/api/tickets/verify` | Verify ticket by number + code |
| GET | `/api/tickets/my` | List organizer's tickets |
| GET | `/api/orders/:id/tickets` | Get tickets for an order |

### Payments & Payouts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payouts/request` | Request payout (organizer) |
| GET | `/api/payouts` | List payout requests |
| GET | `/api/payouts/my-requests` | Organizer's own requests |
| PATCH | `/api/admin/payouts/:id` | Approve/reject payout (admin) |
| PATCH | `/api/admin/payouts/:id/process` | Mark payout as processed (admin) |

### KYC
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload/kyc` | Upload KYC document (PDF, 3MB max) |
| GET | `/api/kyc/status` | Get KYC status |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/organizers` | List all organizers |
| PATCH | `/api/admin/organizers/:id` | Update organizer (KYC, role) |
| DELETE | `/api/admin/organizers/:id` | Delete organizer |
| GET | `/api/admin/events` | List all events |
| PATCH | `/api/admin/events/:id` | Update any event |
| DELETE | `/api/admin/events/:id` | Delete any event |
| GET | `/api/admin/tickets` | List all tickets |
| GET | `/api/admin/audit-logs` | View audit logs |

## Security

- **No hardcoded secrets**: All credentials sourced from environment variables
- **Firebase Auth**: JWT verification on every authenticated request
- **Data isolation**: Events/tickets scoped by `organizerId` — server enforces ownership
- **KYC**: PDF-only uploads (3MB max), compressed via pdf-lib
- **QR payload**: JSON with user-facing fields only — no internal IDs or secrets
- **Ticket numbers**: Random `OTK-XXXXXX` format — not sequential or predictable
- **Session persistence**: Token in `localStorage` — navigating to public pages never clears auth

## Scripts

```bash
npm run dev       # Start dev server (tsx + --env-file)
npm run build     # Build for production (Vite + esbuild)
npm run start     # Start production server
npm run lint      # TypeScript type-check
```

## License

MIT
