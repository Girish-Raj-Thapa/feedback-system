# Product Specification: Customer Feedback & Decision Insights SaaS (V1)

## 1. Product Overview & Positioning

### 1.1 What We Are Building
A lightweight, customizable **Customer Feedback Collection & Decision Insights Platform** built for startups and small businesses. 

Businesses use the platform to collect structured ratings and open-ended feedback through a **customizable embeddable widget** or a **standalone hosted link/QR code** (`yourdomain.com/f/slug`), automatically organize responses into **clean, locked theme buckets**, and see exactly which issues are dragging down customer satisfaction or driving churn.

### 1.2 Target Customers
1. **SaaS Startups & Web/Mobile Apps:** Need in-app widgets, cancellation/friction feedback, user tier tagging (`Free` vs. `Paid`), and Slack/webhook alerts without paying $79–$299/month.
2. **E-Commerce & Online Brands:** Need post-purchase links, checkout feedback, and packaging QR codes to spot product quality, sizing, or shipping issues early.
3. **Agencies, Clinics & Local SMBs:** Need shareable links and QR codes to collect client satisfaction scores and catch unhappy customers privately before they leave bad public reviews.

### 1.3 Core Value Proposition
- **Flexible UI, Standardized Insights:** Customers can customize the questions, categories, and branding of their widget or form so it never feels rigid, while the backend normalizes every response into clean decision metrics.
- **Works at Low & High Volume:** Instead of noisy "weekly % trend" charts that fail when a business only gets 30 responses a month, the dashboard calculates **Score Drivers**—showing which specific topics pull a business's average rating up or down.
- **Zero Tag Sprawl:** Uses a **Locked-Bucket Taxonomy** (8–12 fixed workspace themes) so AI classification never invents duplicate messy tags (like *"Slow Shipping"*, *"Late Delivery"*, and *"Courier Delay"*).
- **Predictable, High-Margin Economics:** Combines deterministic metadata rules with ultra-low-cost small-model classification (capped per plan) and zero fragile third-party social API dependencies.

---

## 2. Core System Principles

### 2.1 The "Core Signal Trio" (How Custom Forms Produce Clean Analytics)
Even though every business can customize their form wording, colors, and fields, every submission is normalized into three standard signals:
1. **Quantitative Score:** A numeric rating (1–5 Stars, 1–5 Emoji scale, or 1–10 scale) normalized internally to a `0–100` score.
2. **Structured Context & Metadata:**
   - **User-Selected:** Category pill/dropdown and up to 3 custom multiple-choice questions.
   - **Auto-Captured:** Page URL, referrer, device type, and URL query tags (`?ref=instagram`, `?location=store_1`).
   - **Developer Pass-Through (Optional):** Custom key-value attributes (`user_id`, `email`, `plan_tier`, `monthly_spend`).
3. **Open-Text Explanation:** The customer's written feedback explaining *why* they gave that score.

### 2.2 Locked-Bucket Taxonomy (No Free-Form Tag Invention)
- Every workspace operates with **8 to 12 Locked Theme Buckets** (initialized from an industry preset during onboarding and fully editable by the business owner).
- When open-text feedback arrives, the classification pipeline maps it **strictly** to 1 or 2 existing buckets in that workspace plus a sentiment (`Positive`, `Neutral`, `Negative`), or places it into `Other / Uncategorized`.
- The system **never** invents new tag strings automatically. When 10+ items accumulate in `Other` around a similar topic, the dashboard suggests promoting that topic to an official bucket with one click.

---

## 3. Core Feature Modules (V1 Scope)

### Module 1: The Form & Widget Studio (Customization & Templates)
Allows business owners to create a feedback experience tailored to their brand in under 3 minutes.

- **Industry Starter Templates:**
  - *SaaS / App General Feedback & Bug Catcher*
  - *Subscription Cancel / Exit Reason Flow*
  - *E-Commerce Post-Purchase & Delivery Check*
  - *Website Pricing / Checkout Hesitation Prompt*
  - *Service / Local Business Satisfaction & Review Router*
  - *Blank Custom Form*
- **Customizable Form Elements:**
  - **Header & Intro:** Custom title, subtitle, and brand logo.
  - **Rating Block (Required or Optional):** Choose between 5-Star scale, 5-Emoji reaction scale, or 1–10 number scale.
  - **Category Selector Pills:** Owner defines custom clickable pills (e.g., `Bug`, `Feature Idea`, `Pricing`, `Support` or `Sizing`, `Shipping`, `Quality`).
  - **Custom Questions (Up to 3):** Add custom single-select radio buttons, multi-select checkboxes, or short text inputs.
  - **Open Feedback Textarea:** Customizable placeholder prompt (e.g., *"What could we improve?"*).
  - **Customer Contact Field:** Optional, required, or hidden email/name input (auto-hidden if passed silently via widget script).
- **Conditional Thank-You / Outcome Screen:**
  - Show a different final screen based on the user's rating:
    - **Low Score (e.g., 1–3 Stars):** Apologetic private message assuring direct founder/owner follow-up.
    - **High Score (e.g., 4–5 Stars):** Custom thank-you message with an optional button linking to an external review page (Google Reviews, Trustpilot, G2, App Store) or a discount code.
- **Visual Theme Controls:** Brand primary color, background theme (Light / Dark / Auto), corner radius, and widget button position (Bottom-Right, Bottom-Left, Side Tab).
- **Split-Screen Live Preview:** Real-time interactive preview switching between **Website Widget**, **Mobile Sheet**, and **Standalone Form Page**.

---

### Module 2: Omnichannel Collection & Ingestion Pipes
Four low-maintenance ways to collect feedback without relying on restricted social media APIs.

1. **Embeddable Web Widget (`<script>`):**
   - Lightweight asynchronous script snippet.
   - Display modes: Floating launcher button, center modal triggered by a custom button click (`data-feedback-open`), or inline page embed.
   - Accepts silent user identification and custom properties via JavaScript SDK call (e.g., `user_email`, `plan: "pro"`, `spend: 49`).
2. **Standalone Hosted Page (`yourdomain.com/f/{slug}`):**
   - Mobile-optimized, fast-loading full-screen page for sharing in Instagram/TikTok bios, email footers, WhatsApp messages, or customer support signatures.
   - Supports URL query parameter capture (e.g., `yourdomain.com/f/acme?ref=tiktok&product=hoodie`) to track channels and products automatically without code.
3. **Auto-Generated QR Code:**
   - Instant downloadable PNG/SVG QR code linked to the hosted form (with automatic `?ref=qr` tracking) for physical product inserts, packaging, receipts, or table tents.
4. **CSV Upload & Manual Paste Importer:**
   - Allows owners to upload past survey CSVs or paste raw comments during onboarding so their dashboard is populated with insights on Day 1.

---

### Module 3: Hybrid Classification Pipeline (Keywords + Capped Small LLM)
Processes incoming submissions in the background so the user-facing widget responds instantly.

- **Step 1 — Deterministic Rule Matching ($0 Cost):**
  - Checks if the user already clicked a Category Pill mapped to a Theme Bucket, or if the text matches workspace keyword rules defined by the owner (e.g., words like `"refund"`, `"invoice"`, `"expensive"` -> `Pricing & Billing`).
- **Step 2 — Locked-Bucket AI Classification (Low-Cost Small Model):**
  - If open text is present, a background job sends the comment + the workspace's locked list of 8–12 Theme Buckets to a fast, low-cost model (`Gemini Flash` or `GPT-4o-mini`).
  - Returns strict JSON:
    - `primary_bucket_id` (from locked list or `Other`)
    - `secondary_bucket_id` (optional, nullable)
    - `sentiment` (`positive` | `neutral` | `negative`)
    - `is_spam` (`true` | `false`)
- **Step 3 — Manual Override & Rule Learning:**
  - Business owners can change any item's assigned bucket or sentiment with 1 click in the dashboard.

---

### Module 4: "Score Driver" Insights & Decision Dashboard
Designed to deliver clear business decisions whether the customer has 25 responses or 2,500 responses.

- **1. Executive Summary Bar:**
  - **Overall Satisfaction Score:** Average rating (e.g., `4.2 ★`) and total responses in the selected time period.
  - **Biggest Negative Driver:** The Theme Bucket pulling the overall average score down the most.
  - **Biggest Positive Driver:** The Theme Bucket with the highest satisfaction rating.
  - **Needs Attention Count:** Number of unresolved negative submissions from high-value or contactable customers.
- **2. The "Score Driver" Impact Table (Core Analytical View):**
  - Lists every Locked Theme Bucket with:
    - **Response Count & % Share** (e.g., `Pricing & Billing` — 14 responses / 28%)
    - **Bucket Average Rating** (e.g., `2.1 ★`)
    - **Net Score Impact** (e.g., `-0.45 ★ impact on overall score`)
    - **Sentiment Breakdown Bar** (% Positive vs. Neutral vs. Negative)
  - Clicking any row filters the response feed below to show the exact customer quotes for that theme.
- **3. Segment & Context Filters:**
  - One-click dropdowns to filter the entire dashboard by:
    - **Source / Channel** (`Widget`, `QR Code`, `ref=instagram`, `ref=email`)
    - **Page URL** (e.g., `/pricing` vs. `/checkout`)
    - **Custom User Attributes** (e.g., `plan_tier = paid` vs. `free`)
- **4. Decision Log (Before vs. After Impact Marker):**
  - Owners can log a timestamped business action (e.g., *"Oct 20: Simplified checkout form"* linked to the `Checkout / UX` bucket).
  - The dashboard compares that bucket's complaint share and average rating **before vs. after** the logged date.

---

### Module 5: Triage Inbox, Alerts & Integrations
Turns insights into daily follow-through and connects with existing workflows at $0 platform cost.

- **The Triage Inbox:**
  - Clean list of individual feedback submissions with search and filters (by Bucket, Rating, Sentiment, Status, or Source).
  - **Status Workflow:** `New` -> `In Review` -> `Resolved` (plus `Spam / Archived`).
  - **Direct Email Reply (`mailto:` or Reply Link):** If the end-user provided an email address, the owner can click **Reply to Customer** with a pre-filled subject and quote context to resolve their issue personally.
- **Real-Time Alert Rules ($0 Marginal Cost):**
  - Owners configure simple triggers (e.g., *All submissions*, *Only ratings <= 3 stars*, or *Only Paid users*):
    - **Slack & Discord Incoming Webhooks:** Sends a formatted card with the rating, comment, bucket tag, user metadata, and a direct link to the item.
    - **Email Notifications:** Instant alert or daily/weekly summary email.
    - **Outbound JSON Webhook:** Fires a clean JSON payload to any URL so users can connect **Make.com**, **n8n**, **Zapier**, or their own backend.
- **Data Portability:**
  - 1-click **CSV Export** of all responses, scores, tags, and custom metadata.

---

## 4. End-to-End System Workflows

### Workflow 1: Workspace Onboarding (Under 3 Minutes)
1. **Sign Up & Industry Selection:** Owner creates an account, names their workspace, and picks their business type (`SaaS / Tech`, `E-Commerce / Retail`, `Service / Agency`, or `Local Business`).
2. **Automatic Setup:** The system pre-loads 8 relevant **Locked Theme Buckets** and a matching **Starter Form Template**.
3. **Customize & Publish:** Owner tweaks the form title, colors, or category pills in the Studio and clicks **Publish**.
4. **Deploy or Import:** Owner copies their **Hosted Link / QR Code**, embeds the **`<script>` snippet**, or uploads a **CSV** of past feedback to see instant charts.

### Workflow 2: End-User Submission Flow (5–15 Seconds)
1. **Trigger:** End-user opens the widget on the client's site or visits `yourdomain.com/f/brand?ref=ig`.
2. **Input:** User taps a rating (e.g., `2 ★`), clicks a category pill (`Pricing`), and types a short comment.
3. **Submission:** Frontend sends a `POST` request with the form answers + auto-captured metadata (`page_url`, `ref`, `device`, and any passed-in `user` attributes).
4. **Immediate Outcome:** API validates, rate-limits by IP, saves the raw record with status `New`, and immediately returns `200 OK` so the widget displays the configured **Thank-You / Outcome Screen** (e.g., private recovery message for `2 ★`, or external review button for `5 ★`).

### Workflow 3: Background Enrichment & Alerting
1. **Async Queue Trigger:** Saving the submission enqueues a background task (`process_submission(submission_id)`).
2. **Classification:** Worker applies deterministic keyword/category rules first; if open text requires classification and the workspace is within its monthly AI quota, it calls the small LLM with the workspace's locked bucket list.
3. **Database Update:** Worker updates the submission with `primary_bucket_id`, `sentiment`, and recalculates workspace bucket aggregates.
4. **Webhook Dispatch:** If the enriched submission matches the workspace's alert rules (e.g., `rating <= 3`), the worker fires the Slack/Discord card and outbound JSON webhook.

### Workflow 4: Weekly Digest & Decision Tracking
1. **Weekly Digest Job:** Every Monday morning, a scheduled job compiles the workspace's 7-day summary (Total responses, average score, Top Negative Score Driver, Top Positive Score Driver, and 3 highlighted quotes) and emails it to the owner.
2. **Triage & Action:** Owner reviews the Score Driver table, marks fixed items as `Resolved`, and logs key product/business changes in the **Decision Log** to track improvement over the next 30 days.

---

## 5. Strict Scope Boundaries (V1 Guardrails)

| Area | IN SCOPE for V1 | OUT OF SCOPE for V1 (Do Not Build Yet) |
| :--- | :--- | :--- |
| **Form Builder** | Single-screen or 2-step customizable form (Rating + Category Pills + up to 3 custom fields + Open Text + Conditional Outcome Screen). | Multi-page survey trees, complex `IF/THEN` branching builders, or free-form CSS layout editors. |
| **Ingestion Channels** | Web `<script>` Widget, Hosted `/f/slug` Link, QR Code Generator, and CSV/Paste Importer. | Native TikTok/Instagram comment scraping APIs, inbound email parsing servers, or native iOS/Android binary SDKs. |
| **Public Portals** | Private owner dashboard + shareable submission form. | Public feature-voting roadmaps, user login accounts for voters, or public comment threads. |
| **AI Usage** | Locked-bucket classification on open text + optional weekly digest summary (capped by plan tier). | Per-submission AI chat follow-up interviews, open-ended tag invention, or vector embedding databases. |
| **Integrations** | Slack webhook, Discord webhook, generic outbound JSON webhook, and CSV export. | Deep two-way Jira/Linear/HubSpot OAuth syncs or full helpdesk ticketing suites. |

---

## 6. Pricing & Unit Economics Guardrails

| Plan Tier | Target Customer | Monthly Limits | Estimated Max AI/Infra Cost per User |
| :--- | :--- | :--- | :--- |
| **Free / Trial ($0/mo)** | Testing & micro-projects | 50 submissions/month, 1 form, *"Powered by"* badge on widget/form | Less than **$0.01/mo** |
| **Starter ($12/mo)** | Solo founders & small shops | 500 submissions/month, 3 forms, custom branding, Slack/Discord alerts, CSV export | Less than **$0.05/mo** (>95% gross margin) |
| **Growth ($24/mo)** | Growing startups & brands | 2,500 submissions/month, unlimited forms, remove badge, Custom User Attributes, Outbound Webhooks, Weekly Digest | Less than **$0.20/mo** (>95% gross margin) |

*Note: If a customer exceeds their monthly submission quota, the system continues capturing ratings and raw feedback so they never lose data, pauses AI auto-tagging until the next billing cycle (or upgrade), and displays an upgrade banner in their dashboard.*