# Voice of Customer (VoC) Feedback & Decision Platform

> A founder-friendly customer feedback aggregation and decision engine. Converts scattered feedback into high-leverage product priorities using deterministic score drivers at **$0 AI token cost**.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────┐
                      │            PUBLIC CUSTOMER TOUCHPOINT     │
                      │  • Hosted Feedback Form (/f/[ws]/[slug])  │
                      │  • 4KB Embeddable Floating Widget         │
                      └─────────────────────┬─────────────────────┘
                                            │ HTTP POST
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │              FASTAPI BACKEND              │
                      │  • Rate Limiting & Auth Guard (JWT/Cookie)│
                      │  • Deterministic Category Auto-Tagging    │
                      │  • Normalized Rating Math (5★ Equivalent) │
                      │  • Net Score Driver Calculation (Δ Score) │
                      └───────┬───────────────────────────┬───────┘
                              │                           │
                   PostgreSQL (Asyncpg)             Redis (Cache/RateLimit)
                              │
                              ▼
                      ┌───────────────────────────────────────────┐
                      │             NEXT.JS FRONTEND              │
                      │  • Popover Workspace Switcher Shell       │
                      │  • Decision Insights (Macro Score Drivers)│
                      │  • Feedback Inbox (Triage & Loop-Closing) │
                      │  • Form Studio (Compliant Outcomes)       │
                      │  • Unified Workspace & Account Settings   │
                      └───────────────────────────────────────────┘
```

---

## Key Platform Features

### 1. Decision Insights & Score Drivers
* **The Score Driver Engine**: Calculates category impact using deterministic SQL math:
  $$\Delta = \bar{R}_{\text{category}} - \bar{R}_{\text{overall}}$$
  * **Negative Score Drivers** ($\Delta < 0$): Pinpoints the exact feature dragging satisfaction down (e.g. *Pricing is pulling satisfaction down by -1.8★*).
  * **Positive Score Drivers** ($\Delta > 0$): Highlights what customers praise most (e.g. *Performance is boosting satisfaction by +0.7★*).
* **At-Risk Account Detection**: Instantly counts unaddressed negative feedback or low ratings waiting for triage.
* **Locked Theme Buckets**: Auto-seeded industry categories with keyword routing so feedback auto-organizes without AI hallucinations.

### 2. Actionable Triage & 1-Click Loop Closing
* **Triage Lifecycle**: `New` $\to$ `In Progress` $\to$ `Resolved` (with `Archived` option).
* **1-Click Email Reply**: `mailto:` link pre-populated with customer quote and context.
* **Drawer Tag Overrides**: Correct category classification or sentiment in 2 seconds directly from the slide-out inspection drawer without visiting settings.
* **Customer History**: Full past submission timeline and average rating across all feedback submitted by that customer email.

### 3. FTC-Compliant Form Studio
* Fully compliant with **FTC 16 CFR § 465** and Google/Trustpilot review gating guidelines.
* Promoters and detractors alike are given direct, unblocked review platform links alongside dedicated customer support routing.
* Live form preview and embed snippet generator.

### 4. Zero-State Onboarding & Sample Data
* 3-step setup guide for new workspaces (Categories $\to$ Forms $\to$ Insights).
* **1-Click Load Sample Feedback**: Seeds 6 realistic feedback items across diverse categories and sentiments so founders can explore the score driver dashboard before receiving live traffic.
* **1-Click Clear Sample Data**: Purges demo feedback with zero trace before going to production.

---

## Tech Stack

### Frontend
* **Framework**: Next.js 15 (App Router, React 19)
* **Styling**: Tailwind CSS, Lucide React, Sonner (Toasts)
* **State Management**: Zustand
* **Testing**: Vitest, React Testing Library, JSDOM (190 automated tests across 37 test suites)

### Backend
* **Framework**: FastAPI (Python 3.12)
* **Package Manager**: `uv`
* **Database**: PostgreSQL with SQLAlchemy 2.0 (Asyncpg) & Alembic
* **Cache & Rate Limiting**: Redis
* **Validation**: Pydantic v2
* **Linting & Types**: Ruff, Pyright

---

## Directory Structure

```
feedback-system/
├── backend/
│   ├── app/
│   │   ├── core/              # Config, Security, Redis, Middleware, DB Session
│   │   ├── features/
│   │   │   ├── auth/          # Users, Workspaces, RBAC, Sessions, Invites
│   │   │   └── feedback/      # Forms, Submissions, Categories, Insights Math
│   │   └── main.py            # FastAPI Entrypoint
│   └── tests/                 # Pytest test suites (unit & integration)
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (Workspace, Forms, Auth, Public)
│   │   ├── components/        # Sidebar, Insights Tab, Drawer, Checklist, UI primitives
│   │   ├── repositories/      # Typed API client repositories
│   │   ├── store/             # Zustand workspace and auth stores
│   │   └── types/             # Shared TypeScript models and interfaces
│   └── tests/                 # Vitest test suites
└── docs/                      # Architectural specs and Product Roadmap
```

---

## Getting Started

### Prerequisites
* Python 3.12+ and `uv`
* Node.js 18+ and `npm`
* PostgreSQL and Redis (for local development or testing with Docker)

### Backend Setup
```bash
cd backend

# Install dependencies with uv
uv sync

# Run linting and type checks
uv run ruff check .
uv run pyright app/ tests/

# Run unit tests
PYTHONPATH=. uv run pytest tests/feedback/test_insights_service.py tests/feedback/test_sample_data.py
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run TypeScript type check
npx tsc --noEmit

# Run unit test suite
npm test
```

---

## Verification & Test Results

```text
Backend:
✓ uv run ruff check .               --> All checks passed
✓ uv run pyright app/ tests/        --> 0 errors, 0 warnings
✓ pytest (unit suites)              --> 12/12 unit tests passing

Frontend:
✓ npx tsc --noEmit                  --> 0 type errors
✓ npm test                          --> 37/37 test files passed, 190/190 tests passed
```

