# Frontend Design System & UI Specification

Scope: `frontend/`. Read before creating, styling, or modifying any frontend UI component, page, layout, widget, or form.
This specification derives directly from [`design.md`](file:///Volumes/GIRISH/Programming/feedback-system/design.md) and governs all visual and interaction decisions.

---

## 1. Core Design Principles

1. **Calm and Data-First**: The interface stays quiet so the customer's feedback and the Score Drivers are the loudest elements on screen. Inspired by Apple Health & Stocks (calm, grouped, data-forward).
2. **One Memorable Thing Per Screen**: Each screen has a single clear focal point (e.g., the Score Driver chart, the active feedback thread, the form preview). Everything around it is restrained.
3. **Color is Communication (Strict 3-Way Separation)**:
   - **Brand / Action (`--action`)**: You can act on or click this.
   - **System Status (`--status-*`)**: The system is telling you something.
   - **Data Direction (`--data-lift` / `--data-drag`)**: This moves your score.
   - **Hard Rule**: These three categories NEVER mix. Brand color is never used on errors; data drag is never colored with system error red; status colors are never decorative.
4. **Themeable by Construction**: The workspace brand color is customizable via an 11-step OKLCH scale. Components never reference raw hex values or arbitrary Tailwind colors.
5. **Honest with Small Numbers**: Built for SMBs with 30 responses/month. Never fake precision with noisy weekly "% volume trend" charts. Use Net Score Impact (`+0.4 ★`, `-0.6 ★`), response counts, and real customer quotes.

---

## 2. Surfaces & Neutral Balance (Apple Design Theme)

The default theme strictly adopts the **Apple Website & macOS/iOS Design Language**:
- **Light Mode**:
  - **Canvas (60%)**: `--bg-canvas`: `#F5F5F7` (Apple's signature light gray canvas background).
  - **Surface (30%)**: `--bg-surface`: `#FFFFFF` (Pure white elevated cards, tables, popovers).
  - **Subtles & Tracks**: `--bg-subtle`: `#E8E8ED` (Muted input fills, segmented control tracks).
  - **Borders & Dividers**: `--border`: `#D2D2D7` (Apple hairline border).
  - **Text**: `--text`: `#1D1D1F` (Apple primary dark text), `--text-muted`: `#86868B`.
- **Dark Mode**:
  - **Canvas (60%)**: `--bg-canvas`: `#000000` (Apple true OLED black canvas).
  - **Surface (30%)**: `--bg-surface`: `#1C1C1E` (Apple macOS/iOS system grouped surface).
  - **Subtles & Tracks**: `--bg-subtle`: `#2C2C2E` (Secondary system fill).
  - **Borders & Dividers**: `--border`: `#38383A` (Subtle dark hairline).
  - **Text**: `--text`: `#F5F5F7` (Apple high-contrast white), `--text-muted`: `#A1A1A6`.

---

## 3. The Color Token System

### 3.1 Brand / Action Tokens (Apple System Blue `#0071E3`)
The default brand theme uses Apple's System Blue:
- **Light Mode**: `#0071E3` (Primary action), hover `#0077ED`, active `#0062C4`.
- **Dark Mode**: `#2997FF` (High-contrast Apple blue against dark surfaces), hover `#47A5FF`, active `#198BFF`.

| Token | Light Value | Dark Value | Purpose |
|---|---|---|---|
| `--action` | `#0071E3` | `#2997FF` | Primary buttons, active toggles, selected controls, filled rating stars |
| `--action-hover` | `#0077ED` | `#47A5FF` | Hover states |
| `--action-active` | `#0062C4` | `#198BFF` | Pressed / active states |
| `--text-on-action` | `#FFFFFF` | `#000000` | Text on primary buttons |
| `--action-subtle` | `#F0F6FF` | `rgba(41,151,255,0.15)` | Selected rows, active navigation background |
| `--action-subtle-fg` | `#0071E3` | `#64B5FF` | Text/icons on subtle action fills |
| `--link` | `#0071E3` | `#2997FF` | Inline text links |
| `--focus-ring` | `#0071E3` | `#2997FF` | Keyboard focus ring |

### 3.2 System Status Tokens (System Messages ONLY)
Status colors are immutable. They never change with workspace themes and never appear as decoration.

| Status | Text (Light) | Background (Light) | Text (Dark) | Background (Dark) |
|---|---|---|---|---|
| **Success** | `#17794A` | `#E8F6EE` | `#30D158` | `rgba(48,209,88,0.16)` |
| **Warning** | `#9A5B05` | `#FDF2DC` | `#FFD60A` | `rgba(255,214,10,0.16)` |
| **Error** | `#C0281B` | `#FDEBE9` | `#FF453A` | `rgba(255,69,58,0.16)` |
| **Info** | `#0071E3` | `#F0F6FF` | `#64D2FF` | `rgba(100,210,255,0.16)` |

### 3.3 Data Direction Tokens (Score Drivers & Sentiment)
Visibly distinct from error red so business owners know feedback dragging a score is customer intelligence, not a broken system. Always pair with a signed number (`+0.4`, `-0.6`) and an arrow/icon.

| Token | Meaning | Light Value | Dark Value |
|---|---|---|---|
| `--data-lift` | Raises the average rating | `#0B7A7C` (Teal) | `#64D2FF` |
| `--data-drag` | Lowers the average rating | `#A82B6F` (Plum) | `#FF375F` |
| `--data-neutral` | No measurable effect / too little data | `--text-subtle` | `--text-subtle` |

---

## 4. Dark Mode & Appearance Architecture

1. **Zero-FOUC Guarantee**:
   - Next.js root layout includes a lightweight inline `<head>` script that checks `localStorage.getItem('theme')` and `window.matchMedia('(prefers-color-scheme: dark)')` before the DOM renders.
   - Prevents any white flash during initial page load in dark mode.
2. **Smooth Color Transitioning (180ms)**:
   - When switching modes, `theme-transitioning` applies `transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease`.
   - Layout properties (width, height, margin, padding) never transition.
3. **Theme Control Components**:
   - `<ThemeProvider>`: Global context managing `theme` (`light` | `dark` | `system`).
   - `<ThemeToggle>`: Segmented or icon toggle button (`@/components/theme-toggle`). Mount in top-navigation and settings.

---

## 4. Typography Standards

- **Font Family**: **Geist Sans** (`var(--font-sans)`) for all interface text; **Geist Mono** (`var(--font-mono)`) for slugs, API keys, and code.
- **Tabular Numbers**: Always apply `tabular-nums` (`font-variant-numeric: tabular-nums`) to ratings, Net Impact scores, response counts, percentages, and dates to prevent visual jitter.
- **Metric Cards**: Display primary scores and counts at `2rem (32px)` bold with tabular numerals (`text-2xl md:text-3xl font-bold tabular-nums text-text`).
- **Sentence Case Everywhere**: Use sentence case for all headings, buttons, tabs, and table headers. Never use ALL-CAPS or tracked-out mini eyebrows.
- **Customer Feedback Quotes**: Treat customer comments as content, not chrome. Render at standard body size in `--text`. Never truncate to a single line in tables; clamp to 2 lines with an expand affordance.

---

## 5. Geometry, Heights & Micro-Interactions

### 5.1 Role-Based Border Radii (No Uniform Rounding)
| Token | Value | Tailwind Class | Used For |
|---|---|---|---|
| `--radius-xs` | 4px | `rounded-[4px]` | Checkboxes, tiny indicators |
| `--radius-sm` | 6px | `rounded-[6px]` | Badges, tags, tooltips, progress fills |
| `--radius-md` | 10px | `rounded-[10px]` | Buttons, text inputs, selects |
| `--radius-lg` | 14px | `rounded-[14px]` | Cards, popovers, dropdown menus |
| `--radius-xl` | 20px | `rounded-[20px]` | Dialogs, modal sheets, hero panels |
| `--radius-full` | 9999px | `rounded-full` | Category pills, user avatars, status switches |

### 5.2 Control Heights (Strict Parity)
Inputs, selects, and buttons that sit side by side MUST use identical height tokens:
- **`sm` (32px / `h-8`)**: Table filters, compact action bars, small dialogs.
- **`md` (40px / `h-10`)**: Standard forms, search bars, primary buttons.
- **`lg` (48px / `h-12`)**: Public pages, wizard steps, mobile actions.
- **Touch Target Guarantee**: Minimum 44px hit area on coarse pointer devices.

### 5.3 Micro-Interactions & Depth
- **Tactile Button Press**: Buttons physically compress on click: `active:scale-[0.98] transition-all duration-100 ease-out`.
- **Card Depth**: Soft hairline + elevation shadow: `border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-none`.
- **Floating Menus**: Dropdowns and popovers use `shadow-[0_8px_24px_-4px_rgba(16,24,40,0.12)]`.
- **Sticky Glass Header**: Top navigation bar uses `glass-header` (`backdrop-filter: saturate(180%) blur(20px)` at 72% opacity) with a hairline border appearing on scroll.

---

## 6. Component Usage Guide for Agents

### 6.1 Buttons (`@/components/ui/button`)
```tsx
import { Button } from "@/components/ui/button";

// Primary Action (uses --action)
<Button>Create Workspace</Button>

// Secondary / Outline
<Button variant="outline">Cancel</Button>

// Compact Table Action
<Button variant="outline" size="sm">Filter</Button>

// Destructive Action (System Error Red)
<Button variant="destructive">Delete Form</Button>
```

### 6.2 Badges & Chips (`@/components/ui/badge`)
```tsx
import { Badge } from "@/components/ui/badge";

// 1. Locked Theme Bucket Chips (Strictly Neutral per design.md)
<Badge variant="default">Pricing & Billing</Badge>

// 2. Score Driver: Lift (Teal)
<Badge variant="lift">+0.4 ★</Badge>

// 3. Score Driver: Drag (Plum)
<Badge variant="drag">-0.6 ★</Badge>

// 4. System Status
<Badge variant="success">Active</Badge>
<Badge variant="warning">Expiring</Badge>
<Badge variant="error">Payment Failed</Badge>
```

### 6.3 Cards (`@/components/ui/card`)
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Score Drivers</CardTitle>
    <CardDescription>Which themes pull customer satisfaction up or down</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Data-first visualization */}
  </CardContent>
</Card>
```

---

## 7. Anti-AI-Slop Code Checklist (Reject if Violated)
- [ ] No generic purple-to-indigo gradients (`from-purple-500 to-indigo-600`).
- [ ] No floating `blur-3xl` ambient glow circles.
- [ ] No hardcoded hex values in component files (`#1D6FE0`, `#fff`, etc.) — use semantic tokens (`bg-action`, `bg-surface`, `text-text`).
- [ ] No `space-x-*` or `space-y-*` — use `flex flex-col gap-4`.
- [ ] No error red used for negative feedback scores — use `--data-drag` (Plum).
- [ ] No rainbow-colored theme bucket chips — theme chips use neutral `--bg-subtle` with icons.
- [ ] All numeric scores, ratings, and counts have `tabular-nums`.
- [ ] All buttons have `active:scale-[0.98]` tactile press.

