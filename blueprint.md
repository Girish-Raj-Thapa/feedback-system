# Master System Blueprint: Voice of Customer (VoC) & Decision Insights Platform (V1)

## 1. Executive Summary & Category Definition

### 1.1 What This System Is
A lightweight **Voice of Customer (VoC) & Customer Decision Engine** built for startups, SaaS products, e-commerce brands, and small businesses.

It enables business owners to collect customer ratings and open-ended feedback via a **customizable embeddable widget** or a **standalone hosted link/QR code** (`yourdomain.com/f/{slug}`), automatically categorize every response into **clean, locked theme buckets**, and quantify which exact problems are dragging down customer satisfaction or revenue.

### 1.2 What This System Is NOT (Category Boundaries)
To keep the product focused, profitable, and maintainable for a solo engineer, it strictly avoids overlapping with two adjacent categories:

| Category | Primary Purpose | How Our Platform Differs |
| :--- | :--- | :--- |
| **Not a CRM** *(e.g., HubSpot, Pipedrive)* | Tracks sales pipelines, leads, deal stages, and account histories for sales reps. | We do not manage sales deals or contact databases. We capture **product and experience signals** (and optionally receive customer tier/spend tags) to explain *why* customers buy, stay, or leave. |
| **Not a Help Desk** *(e.g., Zendesk, Intercom)* | Manages 1-on-1 live chat and multi-reply support tickets ("Reset my password") for support agents. | We do not do live chat or back-and-forth ticket threads. We do **many-to-one aggregation**—grouping dozens or hundreds of customer voices into clear business themes and score drivers for founders and operators. |

---

## 2. Core Architectural Pillars

### Pillar 1: The "Core Signal Trio" (Custom UI -> Standardized Data)
Customers can customize their widget or form UI so it never feels rigid, while every submission still normalizes into three consistent signals for the analytics engine:
1. **Quantitative Score:** A 1–5 Star rating, 1–5 Emoji reaction, or 1–10 score (normalized internally to a `0–100` scale).
2. **Structured Context & Metadata:**
   - **Explicit User Inputs:** Selected Category Pill and up to 3 custom multiple-choice/short-text fields.
   - **Auto-Captured Context:** Page URL, referrer, device/browser type, and URL query parameters (`?ref=instagram`, `?sku=hoodie`).
   - **Silent App Pass-Through (Optional):** Key-value attributes passed via the widget script or link (`user_id`, `email`, `plan_tier`, `monthly_spend`).
3. **Open-Text Explanation:** The customer's written comment explaining the reason behind their rating.

### Pillar 2: The Locked-Bucket Taxonomy (Zero Tag Sprawl)
Free-form AI tagging ruins analytics by inventing duplicate tags (`"Slow Shipping"`, `"Late Delivery"`, `"Courier Delay"`). Our system enforces a strict **Locked-Bucket Taxonomy**:
- Each workspace has **8 to 12 Locked Theme Buckets** initialized from an industry preset during onboarding and fully editable by the owner (e.g., `Pricing & Billing`, `Product Quality / Bugs`, `Ease of Use / UX`, `Customer Support`, `Delivery & Speed`, `Missing Features`, plus `Other / Uncategorized`).
- The classification pipeline is **strictly constrained** to map incoming feedback to 1 or 2 existing workspace buckets + a sentiment (`Positive`, `Neutral`, `Negative`), or place it into `Other`.
- **Controlled Bucket Discovery:** Only when 10+ items accumulate in `Other` around a repeated topic does the dashboard prompt the owner to promote that topic to a new official bucket with one click.

### Pillar 3: Low- & High-Volume "Score Driver" Math
Most small businesses receive 25 to 100 responses per month, making "% weekly volume change" charts noisy and useless. Instead, our core analytical metric is **Net Score Impact**:
- The system calculates the overall average rating (e.g., `4.1 ★`) and compares it against the average rating of each Theme Bucket (e.g., responses tagged `Pricing & Billing` average `1.9 ★`, pulling the overall workspace rating down by `-0.5 ★`).
- This tells a business owner with even 25 responses exactly which issue is hurting satisfaction the most.

---

## 3. V1 Feature Specification (The 5 Core Modules)

### Module 1: Form & Widget Studio
A split-screen visual builder where business owners configure how they collect feedback on the left and interact with a live preview on the right.

- **1.1 Industry Starter Presets:**
  - *SaaS / App General Feedback & Bug Catcher*
  - *Subscription Cancel / Exit Survey*
  - *E-Commerce Post-Purchase & Delivery Check*
  - *Pricing / Checkout Hesitation Prompt*
  - *Service / Local Business Satisfaction & Review Router*
  - *Blank Custom Form*
- **1.2 Configurable Form Blocks:**
  - **Header:** Custom title, subtitle, and brand logo.
  - **Rating Scale:** 1–5 Stars, 1–5 Emojis, or 1–10 Numeric scale.
  - **Category Selector Pills:** Clickable tags defined by the owner (can be directly mapped to Locked Theme Buckets for $0-cost deterministic categorization).
  - **Custom Questions (Max 3):** Single-choice radio buttons, multi-choice checkboxes, or short text inputs.
  - **Open Feedback Box:** Custom prompt label and placeholder text.
  - **Contact Capture:** Optional, required, or hidden email/name field (automatically skipped if user identity is passed via the widget SDK).
- **1.3 Conditional Outcome / Thank-You Screen:**
  - Displays a tailored closing screen based on the rating score:
    - **Low Score (e.g., 1–3 Stars):** Private recovery screen thanking the user and assuring them their note goes straight to leadership.
    - **High Score (e.g., 4–5 Stars):** Custom thank-you message with an optional CTA button (e.g., link to leave a public review on Google, Trustpilot, G2, or App Store, or claim a discount code).
- **1.4 Appearance & Trigger Settings:**
  - Brand primary color, Light/Dark theme, corner radius, and launcher position (Bottom-Right, Bottom-Left, Side Tab, or Custom Trigger Button).
  - Live preview toggle across **Website Widget**, **Mobile Sheet**, and **Standalone Hosted Page**.

---

### Module 2: Omnichannel Collection & Ingestion
Four zero-maintenance collection channels built on a single underlying form engine:

1. **Embeddable Web & App Widget (`<script>`):**
   - Lightweight script snippet supporting floating button mode, programmatic modal trigger (`window.FeedbackSDK.open()`), or inline div embed.
   - Supports passing user metadata (`id`, `email`, `tier`, `spend`) and custom URL targeting rules.
2. **Standalone Hosted Form Link (`yourdomain.com/f/{slug}`):**
   - Fast, mobile-first full-screen form for Instagram/TikTok bios, email campaigns, WhatsApp links, and receipts.
   - Automatically records any URL query parameters (`?ref=tiktok`, `?order_id=992`, `?branch=kathmandu`) as filterable metadata.
3. **Downloadable QR Code Generator:**
   - One-click PNG/SVG QR code generated for every form (auto-tagged with `?ref=qr`) for physical packaging, flyers, or store tables.
4. **CSV & Copy-Paste Importer:**
   - Lets owners upload existing CSV feedback/reviews or paste raw text comments during onboarding to populate their dashboard immediately.

---

### Module 3: Hybrid Classification & Enrichment Pipeline
Processes every submission asynchronously in the background so the user-facing widget or form submits instantaneously.

1. **Ingest & Protection Layer:**
   - Validates payload, sanitizes HTML/text to prevent XSS, enforces IP-based rate limiting, and stores the raw submission in PostgreSQL with status `New`.
2. **Deterministic Tagging First ($0 Cost):**
   - Checks if the selected Category Pill or workspace keyword rules (e.g., `"refund"`, `"invoice"` -> `Pricing & Billing`) already determine the Theme Bucket.
3. **Locked-Bucket Small-LLM Classifier (Capped by Plan):**
   - When open text is present, a background job (`Taskiq` + `Redis`) passes the text and the workspace's locked bucket list to a low-cost model (`Gemini Flash` or `GPT-4o-mini`).
   - Enforces a structured JSON response:
     ```json
     {
       "primary_bucket_id": "uuid-or-other",
       "secondary_bucket_id": null,
       "sentiment": "negative",
       "is_spam": false
     }
     ```
4. **Manual 1-Click Override:**
   - Owners can change any submission's bucket or sentiment in the UI with a single click.

---

### Module 4: "Score Driver" Insights Dashboard
A clean, single-page executive view focused on actionable business decisions rather than vanity charts.

- **4.1 Top Decision Summary Cards:**
  1. **Overall Rating & Volume:** Average score (`4.1 ★`) and total submissions in period.
  2. **#1 Negative Score Driver:** The Theme Bucket pulling the overall score down the most (e.g., `Shipping & Delivery: 1.8 ★ avg`).
  3. **#1 Positive Score Driver:** The Theme Bucket with the highest satisfaction rating.
  4. **At-Risk Customer Alerts:** Count of unresolved negative (`1–2 ★`) submissions from identified or high-tier users.
- **4.2 The Theme Bucket Impact Table:**
  - Ranks all Locked Theme Buckets by **Response Count**, **% of Total Feedback**, **Average Rating**, **Net Score Impact (`-0.4 ★` / `+0.3 ★`)**, and **Sentiment Bar**.
  - Clicking any bucket filters the response drawer to read the exact customer quotes behind that metric.
- **4.3 Context & Segment Filters:**
  - Filter the entire dashboard by **Date Range**, **Form / Channel (`ref`)**, **Page URL**, or **Custom User Attributes (`plan_tier`, `spend`)**.
- **4.4 Decision Log (Before vs. After Impact Tracker):**
  - Allows the owner to record a milestone on a specific date linked to a Theme Bucket (e.g., *"Nov 1: Redesigned pricing page"* -> `Pricing & Billing`).
  - Automatically displays the bucket's complaint share and average score **30 days before vs. 30 days after** that decision.

---

### Module 5: Triage Inbox, Alerts & Outbound Webhooks
Bridges macro insights with lightweight daily action.

- **5.1 Action Triage Feed:**
  - Filterable list of individual submissions with status pills: `New` -> `In Progress` -> `Resolved` (plus `Spam`).
  - **1-Click Personal Follow-Up:** If a customer included their email, clicking **Reply via Email** opens a pre-populated response template referencing their exact quote so the founder can close the loop.
- **5.2 Real-Time Alert Rules ($0 Cost to Platform):**
  - Configurable triggers (e.g., *All responses*, *Score <= 3 Stars*, *Specific Theme Bucket*, or *Paid Tier users*):
    - **Slack & Discord Webhooks:** Pushes rich notification cards directly to a team channel.
    - **Email Alerts:** Instant alert for critical negative ratings + automated **Monday Morning Top-3 Digest**.
    - **Generic Outbound JSON Webhook:** Connects seamlessly to **Make.com**, **n8n**, **Zapier**, or internal APIs.
- **5.3 Data Export:**
  - Full CSV export of all filtered or unfiltered submissions at any time.

---

## 4. End-to-End System Workflows

```
[Business Owner] 
   │ 1. Picks Template -> Customizes Fields/Colors -> Publishes Form
   ▼
[Omnichannel Collection] (Web Widget | /f/slug Link | QR Code | CSV Import)
   │ 2. End-User submits Rating + Category/Fields + Open Text + Auto Metadata
   ▼
[FastAPI Ingest Endpoint]
   │ 3. Rate-limits, saves raw record (Status: New), returns 200 OK -> Shows Outcome Screen
   ▼
[Taskiq + Redis Background Worker]
   │ 4. Runs Keyword Rules + Locked-Bucket LLM Classifier -> Updates DB Aggregates
   ├──► [Insights Dashboard] (Updates Score Drivers, Bucket Rankings & Decision Log)
   └──► [Alert Dispatcher] (Fires Slack, Discord, Email, or Outbound JSON Webhook)
```

---

## 5. V1 Scope Guardrails (What Not to Build Yet)

1. **No Multi-Step Branching Survey Trees:** Keep forms to a clean 1-screen or 2-step flow (Rating + Details -> Outcome Screen).
2. **No Social Media Scraping APIs:** Do not build Meta/Instagram or TikTok comment scraping pipelines in V1; use the Hosted Link (`/f/slug`), QR code, and CSV/Paste importer instead.
3. **No Inbound Email Parsing Servers:** Avoid the GDPR, spam, and signature-parsing overhead of inbound email forwarding in V1.
4. **No Public Voting Portals or End-User Logins:** End-users should never have to create an account or log in to submit feedback.
5. **No Live Chat or Multi-Reply Ticketing:** Keep customer follow-up to a simple 1-click outbound email reply or webhook push to existing tools.

---

## 6. Recommended Tech Stack & Module Mapping

- **Frontend & Hosted Forms:** Next.js (App Router), Tailwind CSS, shadcn/ui.
- **Embeddable Widget (`widget.js`):** Lightweight, isolated vanilla JS / Preact bundle rendering inside a Shadow DOM or clean iframe to prevent CSS collisions and CSP issues on client sites.
- **Backend API:** FastAPI (Python) following a modular, feature-based architecture (`workspaces`, `forms`, `submissions`, `taxonomy`, `analytics`, `webhooks`).
- **Database:** PostgreSQL (using relational tables for core entities and indexed `JSONB` columns for flexible custom form answers and passed-in user metadata).
- **Queue & Caching:** Redis + Taskiq for asynchronous LLM classification, webhook dispatching with retries, and weekly digest scheduling.