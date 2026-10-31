# Feedback System: Frontend Design System

*Version 1.0. Covers the web app, public pages, hosted forms and the embeddable widget. Every frontend decision should trace back to this document.*

## 1. How to use this document

This is the single source of truth for how the product looks and behaves. Screens are assembled from the tokens and components defined here and nothing else. If a screen needs something that does not exist, add it here first, then build it.

Sections 1 to 7 define the foundations (principles, theming, color, type, spacing). Sections 8 to 11 define responsive behavior, layout shells, components and product patterns. Sections 12 to 17 cover the widget, accessibility, content, states and implementation.

## 2. Design principles

1. **Calm and data-first.** The interface stays quiet so the customer’s feedback and the Score Drivers are the loudest things on screen.
2. **One memorable thing per screen.** Each screen has a single focal element. Everything around it is restrained.
3. **Color is communication.** Brand color means “you can act on this.” Status color means “the system is telling you something.” Data color means “this moves your score.” These three never mix.
4. **Themeable by construction.** Users can change the brand color and the appearance mode. Nothing in a component may depend on a specific hue.
5. **Fluid, not just responsive.** Type, spacing and layout scale continuously between breakpoints, and the content shown adapts to the space available instead of simply shrinking.
6. **Accessible by default.** Contrast, focus, touch targets and reduced motion are guaranteed by the tokens, not left to each screen.
7. **Honest with small numbers.** The product is built for businesses with 30 responses a month. Charts and metrics must say so when the sample is small instead of faking precision.

## 3. Surfaces and density

The product has three surfaces. They share one set of tokens but use different scales, so each feels right for its job. The public surface takes its cue from apple.com (spacious, large type). The app surface takes its cue from Apple’s own apps such as Health and Stocks (calm, grouped, data-forward).

| Surface | Where it appears | Feel | Density | Type scale | Page padding |
| --- | --- | --- | --- | --- | --- |
| Public | Landing, pricing, sign-up, sign-in, legal | Spacious, large headlines | Comfortable | Fluid display scale | 16 / 24 / 32 px |
| App | Dashboard, responses, themes, forms, settings | Calm, compact, scannable | Compact | Fixed app scale | 16 / 24 / 32 px |
| Customer-facing | Hosted form at /f/slug and the embeddable widget | Branded by the customer, touch-first | Comfortable | Fixed, 16 px base | 16 / 24 px |

Rules that hold across all three: the same color roles, the same control heights, the same focus ring, the same voice.

## 4. Theming architecture

### 4.1 What users can change

| Setting | Scope | Applies to | Options |
| --- | --- | --- | --- |
| Brand color | Workspace (admins) | App, hosted forms, widget | Any color from a picker, plus 8 presets |
| Appearance mode | Each user | App | Light, Dark, System |
| Widget appearance | Each form | Hosted form and widget | Accent color, mode, corner style, font, logo |

Everything else is fixed on purpose: status colors, data colors, neutrals, the app type scale, spacing and control heights. This is what keeps a workspace with a hot pink theme just as legible and consistent as the default.

### 4.2 Three token layers

1. **Primitive tokens** are raw ramps: `--brand-50` to `--brand-950`, neutral steps, status ramps.
2. **Semantic tokens** are roles: `--action`, `--bg-surface`, `--text-muted`, `--status-error-fg`. Components use only these.
3. **Component tokens** are optional local overrides such as `--button-height`.

Hard rule: components never reference primitives and never contain a hex value. Changing the theme means changing the semantic mapping, never editing a component.

### 4.3 Generating a brand scale from one color

The user picks one seed color. The app derives an 11-step scale in the OKLCH color space, so each step has the same perceived lightness in every theme. That consistency is what makes contrast predictable.

| Step | OKLCH lightness | Typical role (light mode) |
| --- | --- | --- |
| 50 | 97% | Selected row background, tinted panels |
| 100 | 94% | Subtle fills, hover on tinted items |
| 200 | 88% | Borders on tinted items |
| 300 | 80% | Decorative strokes, disabled accents |
| 400 | 70% | Secondary accents |
| 500 | 60% | Focus ring, icon accents, chart accent |
| 600 | 52% | Primary button, active controls |
| 700 | 44% | Button hover, link text |
| 800 | 36% | Button pressed |
| 900 | 30% | Strong text on tints |
| 950 | 22% | Tinted surfaces in dark mode |

Hue comes from the seed. Chroma comes from the seed, capped to the sRGB gamut at each step and eased down toward the light and dark ends (about 25% at step 50, full at 500 to 600, about 60% at 950) so tints stay clean. If the seed is very light or nearly grey (a yellow or a silver, for example), the scale is still built from the fixed lightness steps and the picker tells the user that buttons will be darker than the swatch they chose.

### 4.4 Contrast guarantees

- Text on `--action` is white or near-black, whichever contrasts more. If neither reaches 4.5:1, the `--action` step is moved lighter or darker until one does.
- `--link` and `--action-subtle-fg` reach 4.5:1 on both the canvas and surface colors in both modes.
- `--focus-ring` reaches 3:1 against every color it can sit next to.
- These checks run in code when a theme is saved, not by eye. A seed that fails is adjusted automatically, never rejected, and the user sees the adjusted preview before confirming.
- Selection and active states never rely on hue alone. They always add a second cue such as a check mark, a filled indicator or a weight change.

### 4.5 Presets

| Name | Seed | Notes |
| --- | --- | --- |
| Indigo (default) | #4C5BD4 | Calm, trustworthy, distinct from every status color |
| Blue | #1D6FE0 | Closest to Apple’s system blue |
| Violet | #7C4DDB |  |
| Graphite | #3B4252 | Nearly neutral, for a minimal look |
| Teal | #0E8F8F |  |
| Rose | #D6336C | Near error red; see note |
| Orange | #E8590C | Near warning amber; see note |
| Green | #2F9E44 | Near success green; see note |

Warm, red and green seeds are allowed. The system stays unambiguous because status components always carry an icon and a text label, never use the brand color, and brand color is only ever used on things a person can click or select. The picker shows a short advisory when a seed falls close to a status hue.

### 4.6 Applying and persisting the theme

- The brand seed is stored on the workspace. The full scale is computed when the theme is saved and stored with it, so the server can write the `--brand-*` variables onto the `html` element during rendering. There is no flash of the default color and no client-side computation on load.
- Appearance mode is stored in a cookie (`light`, `dark` or `system`) and read on the server. The `data-theme` attribute and the CSS `color-scheme` property are set before first paint so native controls and scrollbars match.
- Switching themes animates only `background-color`, `border-color` and `color` over 180 ms. Layout properties never transition.
- The theme picker shows a live preview (button, link, selected row, theme chip, a Score Drivers sample) in both modes before saving.
- Reset to the default theme is always one click away.

## 5. Color tokens

### 5.1 Neutrals and surfaces

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--bg-canvas` | Page background | #F5F7FA | #0D1117 |
| `--bg-surface` | Cards, tables, popovers, header | #FFFFFF | #151A22 |
| `--bg-subtle` | Input fill, segmented control track | #EDF0F5 | #1C222C |
| `--bg-hover` | Row and item hover | #F3F5F9 | #19202A |
| `--bg-overlay` | Dialog scrim | rgba(13,17,23,.45) | rgba(0,0,0,.6) |
| `--border` | Hairlines, dividers, card edges | #E1E5EB | #272F3B |
| `--border-strong` | Input borders, emphasized dividers | #C9CFD9 | #3A4453 |
| `--text` | Primary text | #161C26 | #EAEEF4 |
| `--text-muted` | Secondary text, labels | #556070 | #A3ADBB |
| `--text-subtle` | Placeholders, captions | #667284 | #8792A2 |

### 5.2 Brand roles

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--action` | brand-600 | brand-500 (auto-adjusted) | Primary buttons, active toggles, selected controls |
| `--action-hover` | brand-700 | brand-400 | Hover |
| `--action-active` | brand-800 | brand-300 | Pressed |
| `--text-on-action` | white or near-black (auto) | white or near-black (auto) | Label on primary buttons |
| `--action-subtle` | brand-50 | brand-950 | Selected row, active nav item background |
| `--action-subtle-fg` | brand-700 | brand-200 | Text and icons on subtle fills |
| `--link` | brand-700 | brand-300 | Inline links |
| `--focus-ring` | brand-500 | brand-400 | Keyboard focus |

The default Indigo scale: 50 #F0F2FE, 100 #E1E5FC, 200 #C6CDF9, 300 #A0ABF3, 400 #7783EA, 500 #5460DE, 600 #4249C9, 700 #363BA6, 800 #2D3185, 900 #272B69, 950 #181A40.

### 5.3 Status colors (system messages only)

| Status | Light text | Light background | Indicator | Dark text | Dark background |
| --- | --- | --- | --- | --- | --- |
| Success | #17794A | #E8F6EE | #1F9D5C | #5BD08C | rgba(46,160,100,.16) |
| Warning | #9A5B05 | #FDF2DC | #D98A0B | #F2B84B | rgba(226,160,40,.16) |
| Error | #C0281B | #FDEBE9 | #E03C2E | #FF8A80 | rgba(240,80,64,.16) |
| Info | #1A66AD | #E7F1FB | #2B83D6 | #7DB8F0 | rgba(60,140,220,.16) |

Status colors are immutable. They never change with the theme and never appear as decoration. If a person sees red or amber, something needs attention.

### 5.4 Data direction colors (Score Drivers and sentiment)

A theme dragging a score down is information, not an error, so it has its own pair that is visibly different from error red.

| Token | Meaning | Light | Dark |
| --- | --- | --- | --- |
| `--data-lift` | Raises the average rating | #0B7A7C (text), #0F8B8D (bars) | #4FD1C5 |
| `--data-drag` | Lowers the average rating | #A82B6F (text), #B83280 (bars) | #F58BBE |
| `--data-neutral` | No measurable effect, or too little data | `--text-subtle` | `--text-subtle` |

Data colors are always paired with a signed number (+0.4, −0.6) and an arrow or icon, so they never carry meaning through hue alone. They are used only in data visualizations and sentiment indicators, never on buttons, badges or alerts.

### 5.5 Usage rules

1. **Surface balance.** Roughly 60% of any screen is canvas, 30% is surface, and 10% or less is accent. Use cards sparingly: group content with space and hairline dividers first, and add a card only when the content needs a distinct boundary.
2. **Theme chips are neutral.** The 8 to 12 locked themes each get an icon from the fixed icon set and the neutral chip style. They never get their own color, which would collide with status and data colors.
3. **Ratings use the brand color.** Filled stars and selected rating options use `--action`, empty ones use `--border-strong`. This avoids amber stars clashing with the warning color.
4. **No raw colors in code.** A lint rule blocks hex, rgb and hsl values and Tailwind palette classes (such as `bg-blue-500`) inside components.

## 6. Typography

### 6.1 Typefaces

| Role | Family | Used for |
| --- | --- | --- |
| Interface and content | Geist (variable, weights 400 to 700) | All UI text, headings, tables, numbers |
| Code and identifiers | Geist Mono | Form slugs, API keys, webhook URLs, snippets |

Fallback stack for both: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (and `ui-monospace, SFMono-Regular, Menlo, monospace` for the mono family). Load fonts with `next/font` so metrics are matched and layout does not shift. Use only weights 400, 500 and 600 in the app, plus a heavier display weight (650) on public headlines.

Numbers in tables and charts use Geist with `font-variant-numeric: tabular-nums`, so scores, counts and dates line up and never jitter. This replaces the monospace-for-numbers idea from earlier drafts and keeps the product feeling lighter.

### 6.2 Public scale (fluid)

All sizes are in `rem` so they respect the user’s browser font setting. The `clamp()` values scale smoothly between a 360 px and a 1440 px viewport.

| Token | Size | Line height | Tracking | Weight |
| --- | --- | --- | --- | --- |
| `display` | clamp(2.5rem, 1.6rem + 4vw, 4.5rem) | 1.05 | -0.03em | 650 |
| `h1` | clamp(2rem, 1.4rem + 2.6vw, 3.25rem) | 1.1 | -0.025em | 650 |
| `h2` | clamp(1.5rem, 1.2rem + 1.3vw, 2.25rem) | 1.2 | -0.02em | 600 |
| `h3` | clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem) | 1.3 | -0.01em | 600 |
| `body-lg` | clamp(1.0625rem, 1rem + 0.3vw, 1.25rem) | 1.55 | 0 | 400 |
| `body` | 1rem | 1.6 | 0 | 400 |

### 6.3 App scale (compact)

| Token | Desktop (from 768 px) | Mobile (below 768 px) | Weight |
| --- | --- | --- | --- |
| `page-title` | 1.5rem / 2rem | 1.25rem / 1.75rem | 600 |
| `section-title` | 1.125rem / 1.5rem | 1.0625rem / 1.5rem | 600 |
| `body` | 0.875rem / 1.25rem | 1rem / 1.5rem | 400 |
| `body-sm` | 0.8125rem / 1.125rem | 0.875rem / 1.25rem | 400 |
| `caption` | 0.75rem / 1rem | 0.8125rem / 1.125rem | 500 |
| `metric` | 2rem / 2.25rem, tabular | 1.75rem / 2rem, tabular | 600 |

The app body text steps up to 16 px on mobile. That is also the rule for every form field on touch devices: inputs are never smaller than 16 px, which stops iOS from zooming the page on focus.

### 6.4 Typographic rules

- The root font size is never overridden. Sizes are always `rem`, never `px`.
- Body line length stays between 45 and 75 characters (`max-width: 65ch` for reading text).
- Headlines use `text-wrap: balance` and paragraphs use `text-wrap: pretty`.
- Use sentence case everywhere. No all-caps labels, no tracked-out eyebrows above headings.
- Customer feedback text is content, not chrome: show it at `body` size in `--text`, never truncate it to one line in a table. Clamp to 2 lines with an expand affordance.
- Pages must remain usable at 200% browser zoom and with the user’s text size set to 200%. Layouts use `min-height`, never fixed heights, on anything containing text.

## 7. Spacing, sizing, shape, depth and motion

### 7.1 The 4 px grid

Every margin, padding, gap and size is a multiple of 4. The only exceptions are 1 px borders and 2 px icon alignment nudges.

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `space-1` | 4 | `space-8` | 32 |
| `space-2` | 8 | `space-10` | 40 |
| `space-3` | 12 | `space-12` | 48 |
| `space-4` | 16 | `space-16` | 64 |
| `space-5` | 20 | `space-20` | 80 |
| `space-6` | 24 | `space-24` | 96 |

Page padding is 16 px below 640 px, 24 px from 640 px, and 32 px from 1024 px. Vertical gaps between sections on public pages scale fluidly from 64 px to 128 px with `clamp()`.

### 7.2 Control heights

Inputs, selects and buttons that sit side by side must use the same height token.

| Size | Height | Used for |
| --- | --- | --- |
| `sm` | 32 | Table filters, toolbar actions, compact dialogs |
| `md` | 40 | Default forms, search, buttons |
| `lg` | 48 | Public pages, wizard steps, primary mobile actions |

On touch devices (`pointer: coarse`) the effective sizes become `sm` 40 (with a 44 px hit area), `md` 44 and `lg` 48, so every target meets the 44 px minimum.

| Table element | Height |
| --- | --- |
| Header row | 44 |
| Standard row | 48 |
| Compact row | 40 |
| Row on touch devices | 56 minimum |

Icons come from one family (Lucide) at 16, 20 and 24 px with a 1.5 px stroke. Use 16 inside compact controls, 20 as the default, 24 in navigation and empty states.

### 7.3 Radius

| Token | Value | Used for |
| --- | --- | --- |
| `radius-xs` | 4 | Checkboxes, small chips |
| `radius-sm` | 6 | Tags, tooltips, bar fills |
| `radius-md` | 10 | Buttons, inputs, selects |
| `radius-lg` | 14 | Cards, popovers, menus |
| `radius-xl` | 20 | Dialogs, bottom sheets, hero panels |
| `radius-full` | 9999 | Pills, avatars, switches |

Radius differs by role so that nothing is rounded the same by default. Hosted forms and the widget multiply these values by a customer-chosen `--radius-scale` (0, 0.6, 1 or 1.4).

### 7.4 Depth

Depth comes mostly from hairlines and surface color, with soft shadows only where something floats.

| Level | Used for | Light mode | Dark mode |
| --- | --- | --- | --- |
| 0 | Page, inline content | none | none |
| 1 | Cards | 1 px `--border`, shadow 0 1px 2px rgba(16,24,40,.04) | 1 px `--border` |
| 2 | Menus, popovers, sticky header when scrolled | 0 8px 24px -4px rgba(16,24,40,.12) | 1 px `--border-strong` plus a lighter surface |
| 3 | Dialogs, sheets | 0 24px 48px -12px rgba(16,24,40,.25) | 1 px `--border-strong` plus a lighter surface |

The header uses a translucent surface with a backdrop blur (`backdrop-filter: saturate(180%) blur(20px)` over the surface color at 72% opacity) and a hairline that appears on scroll. If `backdrop-filter` is unsupported or the user prefers reduced transparency, it falls back to a solid surface.

### 7.5 Motion

| Token | Duration | Used for |
| --- | --- | --- |
| `motion-fast` | 100 ms | Hover, press, toggles |
| `motion-base` | 180 ms | Menus, tabs, theme switch |
| `motion-slow` | 280 ms | Dialogs, sheets, drawers |

Easing: standard `cubic-bezier(.2, 0, 0, 1)`, entrance `cubic-bezier(.05, .7, .1, 1)`, exit `cubic-bezier(.3, 0, .8, .15)`. Buttons scale to 0.98 on press. Motion responds to a person’s action or marks one important state change. There are no scroll-triggered entrance animations on every section. Under `prefers-reduced-motion`, transforms are removed and transitions become simple opacity fades of 100 ms or less.
