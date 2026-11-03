# Feedback System

> **A Lightweight Voice of Customer (VoC) & Customer Decision Engine.**  
> Capture feedback anywhere with 10-second embed widgets and hosted forms. Automatically categorize feedback, detect customer sentiment, and triage issues in real time with $0 token overhead.

---

## Overview

**Feedback System** is an enterprise-grade, multi-tenant customer feedback and decision platform built for modern product teams, founders, and SaaS businesses. It combines visual form customization, seamless 1-line script embedding, and high-speed rule-based intelligence into a single unified workspace.

### Key Value Propositions
- **Embed Anywhere in 10 Seconds**: Native-feeling responsive widgets for React, Next.js, Webflow, or plain HTML, plus shareable hosted feedback links.
- **$0 Deterministic Automation (No AI Token Costs)**: Lightning-fast in-memory keyword matching and score-based sentiment analysis with zero third-party model bills and `< 10ms` processing latency.
- **Deep Inspection Drawer**: Slide-out triage drawer displaying verbatim comments, custom survey answers, technical device/browser metadata, and lifetime customer history.
- **Customer Journey Unification**: Automatically aggregates all historical feedback from the same customer email to spot repeat detractors or brand advocates.
- **Tailored Outcome Screens**: Dynamic A/B post-submission routing: directs high-scoring promoters to G2/review platforms while immediately routing low scorers to customer support.
- **Multi-Tenant RBAC Security**: Strict workspace-level data isolation with Owner, Admin, Editor, and Viewer system roles.

---

## Architecture

```mermaid
flowchart TD
    subgraph Client["Client Touchpoints"]
        A1["Hosted Form Page (/f/slug/form)"]
        A2["1-Line Embed Widget"]
        A3["Interactive Landing Demo (/)"]
    end

    subgraph Frontend["Next.js 15 Frontend (:3000)"]
        B1["Form Studio (Visual Builder)"]
        B2["Live Feedback Inbox Table"]
        B3["Slide-Out Inspection Drawer"]
        B4["Auth Suite & Workspace Switcher"]
    end

    subgraph Backend["FastAPI Backend (:8005)"]
        C1["Public Submissions Router"]
        C2["Workspace Management & RBAC"]
        C3["$0 Keyword Matcher & Sentiment Engine"]
        C4["Triage & Customer History Service"]
    end

    subgraph Data["Persistence Layer"]
        D1[("PostgreSQL 16 (asyncpg)")]
        D2[("Redis 7 (Cache & Task Broker)")]
    end

    A1 -->|POST /public/forms/.../submit| C1
    A2 -->|POST /public/forms/.../submit| C1
    A3 -->|Preview Simulation| B1

    Frontend -->|REST API v1 + JWT HttpOnly| Backend

    C1 --> C3
    C3 --> D1
    C2 --> D1
    C4 --> D1
    Backend --> D2
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**, **Base UI**, **Lucide Icons**, **Sonner** |
| **Backend** | **Python 3.12**, **FastAPI**, **SQLAlchemy 2.0** (Async), **Alembic**, **Pydantic v2**, **uv** package manager |
| **Database & Cache** | **PostgreSQL 16** (with composite indexes on workspace & customer email), **Redis 7** (Taskiq worker broker & cache) |
| **Testing** | **Vitest** (35 test files, 168+ unit tests), **React Testing Library**, **Pytest** (`pytest-asyncio`, `httpx`), **Ruff**, **Pyright** |
| **Design Language** | Apple-inspired typography (**Geist Sans / Mono**), light/dark theme system, tactile ambient glow backgrounds |

---

## Project Structure

```text
feedback-system/
├── backend/
│   ├── app/
│   │   ├── core/                  # Database, Redis, Tasks, Security, Config
│   │   ├── features/
│   │   │   ├── auth/              # Users, Workspaces, Memberships, RBAC, Services
│   │   │   └── feedback/          # Categories, Forms, Submissions, Triage, Customer History
│   │   │       ├── models/        # SQLAlchemy database entities
│   │   │       ├── repositories/  # Database queries with tenant isolation
│   │   │       ├── routers/       # Public & authenticated REST API routers
│   │   │       ├── schemas/       # Pydantic v2 request/response schemas
│   │   │       └── services/      # Ingestion, keyword scanning & triage logic
│   │   └── main.py                # FastAPI application entrypoint
│   ├── migrations/                # Alembic database migration revisions
│   ├── tests/                     # Pytest async integration test suites
│   ├── docker-compose.yml         # Container orchestration (API, Worker, DB, Redis)
│   ├── pyproject.toml             # uv/Python dependencies and tool configs
│   └── alembic.ini                # Migration configuration
│
└── frontend/
    ├── src/
    │   ├── app/                   # Next.js App Router pages
    │   │   ├── page.tsx           # World-class public landing page
    │   │   ├── (auth)/            # Login, Register, Forgot Password, Verification
    │   │   ├── dashboard/         # Root workspace switcher & profile
    │   │   ├── f/[workspaceSlug]/ # Public hosted form submission pages
    │   │   └── workspace/[slug]/  # Workspace inbox, form studio, settings
    │   ├── components/
    │   │   ├── auth/              # Ambient backgrounds & auth cards
    │   │   ├── landing/           # Landing page hero, bento grid, interactive widget
    │   │   ├── ui/                # Base UI buttons, inputs, cards, badges
    │   │   └── workspace/         # FeedbackDetailDrawer, forms, category tabs
    │   ├── repositories/          # Type-safe API client wrappers
    │   ├── store/                 # Zustand state stores (auth, workspace)
    │   └── types/                 # TypeScript interfaces and schemas
    ├── tests/                     # Pure Vitest component & repository unit tests
    ├── tailwind.config.ts         # Theme tokens and responsive breakpoints
    └── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.18 or higher (v20+ recommended)
- **Docker & Docker Compose**: For PostgreSQL and Redis services
- **Python**: 3.12+ (if running backend outside Docker, managed via [`uv`](https://docs.astral.sh/uv/))

---

### 1. Backend Setup

#### Option A: Run via Docker Compose (Recommended)
```bash
cd backend

# Start API, Background Worker, PostgreSQL, and Redis
docker compose up -d --build
```
- The FastAPI backend will be live at: **`http://localhost:8005`**
- Interactive Swagger API Documentation: **`http://localhost:8005/docs`**

#### Option B: Run Locally with `uv`
```bash
cd backend

# 1. Install uv package manager (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Sync dependencies
uv sync

# 3. Configure environment
cp .env.example .env

# 4. Run database migrations
uv run alembic upgrade head

# 5. Start the FastAPI development server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload
```

---

### 2. Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment (points to backend at :8005)
cp .env.example .env.local

# 3. Start Next.js development server
npm run dev
```

Open [**http://localhost:3000**](http://localhost:3000) in your browser:
- **Landing Page & Live Demo**: `http://localhost:3000`
- **Customer Feedback Inbox**: `http://localhost:3000/workspace/{workspaceSlug}`
- **Form Studio**: `http://localhost:3000/workspace/{workspaceSlug}/forms`
- **Public Hosted Form**: `http://localhost:3000/f/{workspaceSlug}/{formSlug}`

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `dev` | Application runtime environment (`dev`, `prod`) |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5433/feedback_dev` | Async PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis broker and cache connection string |
| `JWT_SECRET_KEY` | *(Secret 64-char hex)* | Secret key for signing HS256 auth tokens |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Access token lifespan |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifespan |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend web origin for CORS and emails |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins list |

### Frontend (`frontend/.env.local`)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8005/api/v1` | URL pointing to the FastAPI backend API |

---

## Core Features & Workflow

### 1. Visual Form Studio & Widget Customizer
- Customize form title, description, and accent branding.
- Select rating scale: **5-Star Rating**, **5-Emoji Scale**, or **1–10 NPS**.
- Configure category pill tags mapped directly to workspace theme buckets.
- Add dynamic custom questions (Text input, Multiple choice, Yes/No switches).
- Generate copy-ready 1-line HTML embed code or share public hosted URLs.

### 2. $0 In-Memory Ingestion & Keyword Categorization
- Automatically scans incoming comments against active category keywords using boundary regex (`\bkeyword\b`).
- Assigns category IDs and pill labels automatically when visitors do not explicitly select a pill.
- Pure in-memory execution: zero LLM latency and \$0 API bills.

### 3. Real-Time Feedback Inbox & Inspection Drawer
- Filter by status: `New`, `Reviewed`, `Archived`.
- Visual indicators for score, category tag, and deterministic customer sentiment (*Positive*, *Neutral*, *Negative*).
- Interactive slide-out drawer providing:
  - Full verbatim customer comment.
  - Custom question responses.
  - Client technical metadata (Source Page URL, Referrer URL, User Agent).
  - Lifetime customer history & past submission browser.
  - 1-click triage actions: **Mark as Reviewed**, **Archive**, **Reopen**.

### 4. Tailored Outcome Screens
- **Promoter Path** ($\ge$ 4 stars / $\ge$ 7 NPS): Celebratory message with a direct call-to-action link to leave a public review on G2, Capterra, or Trustpilot.
- **Detractor Path** ($\le$ 3 stars / $\le$ 4 NPS): Sincere apology message with immediate routing to customer support for rapid issue resolution.

---

## Testing & Quality Assurance

Both frontend and backend include automated test suites and strict static typechecking.

### Run Frontend Tests
```bash
cd frontend

# Run pure Vitest suite (35 test files, 168+ unit tests)
npm test

# Run TypeScript compiler check (strict mode)
npx tsc --noEmit
```

### Run Backend Checks
```bash
cd backend

# Run Ruff linter
uv run ruff check .

# Run Pyright static type checker
uv run pyright app/

# Run Pytest suite
PYTHONPATH=. uv run pytest
```

---

## Key API Endpoints

All protected endpoints require workspace membership and enforce granular RBAC permissions.

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue HttpOnly JWT | Public |
| `GET` | `/api/v1/public/forms/{ws_slug}/{form_slug}` | Fetch active public form configuration | Public |
| `POST` | `/api/v1/public/forms/{ws_slug}/{form_slug}/submit` | Submit feedback with auto categorization | Public |
| `GET` | `/api/v1/workspaces/{id}/feedback/submissions` | List paginated submissions for workspace inbox | `forms:read` |
| `GET` | `/api/v1/workspaces/{id}/feedback/submissions/{id}` | Get detailed submission by ID | `forms:read` |
| `PATCH` | `/api/v1/workspaces/{id}/feedback/submissions/{id}` | Triage status (`reviewed`, `archived`, `new`) | `submissions:triage` |
| `GET` | `/api/v1/workspaces/{id}/feedback/submissions/{id}/customer-history` | Fetch customer submission history & average rating | `forms:read` |
| `GET` | `/api/v1/workspaces/{id}/feedback/forms` | List workspace forms & embed widgets | `forms:read` |
| `POST` | `/api/v1/workspaces/{id}/feedback/forms` | Create a new feedback form/widget | `forms:create` |
| `PATCH` | `/api/v1/workspaces/{id}/feedback/forms/{id}` | Update form design and outcome screen | `forms:update` |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
