# Services & Pricing Onboarding Step

A reusable, accessible, dark-themed supplier onboarding panel that lets
suppliers draft the services they sell, set a per-session base price in XLM,
pick a duration, and describe what each session delivers.

Component: [`<ServicesStep>`](../../src/components/dashboard/services-step/index.tsx)

---

## When to use

Use `<ServicesStep>` whenever a supplier needs to manage a list of bookable
services inside the dashboard. Common surfaces:

- **Onboarding wizard** — Step 2 of 4 in the supplier signup flow.
- **Profile settings** — Edit-pane for an existing supplier profile.
- **Catalog admin** — Any internal tool where support staff curate a
  supplier's offerings.

---

## Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ STEP 2 OF 4                          [ Saved as draft ]  │
│ Services & pricing                                       │
│ Add the services you sell …                              │
├──────────────────────────────────────────────────────────┤
│ 3 of 30 services · all valid        [ ＋ Add service  ]  │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  Service title     [ ____________________ ]          │ │
│ │  Base price (XLM)? [ ____ ]   Duration (mins)?[____] │ │
│ │  Description       [ ____________________ ]          │ │
│ │  [↑ Up] [↓ Down] [⧉ Duplicate]      [🗑 Delete]     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Drafts autosave locally …                  [ Save draft ]│
└──────────────────────────────────────────────────────────┘
```

- **Header**: `<PanelShell>` provides the *eyebrow*, *title*, and *description*
  slots. A `<StatusChip>` in the `action` slot surfaces the draft status.
- **Toolbar**: row count + validation summary + Add button.
- **List**: `<ServiceRow>` per item, each row is a `<li>` with its own
  labeled-up interactive controls.
- **Footer**: explanation copy + Save button.

---

## Component API

### Props

```ts
interface ServicesStepProps {
  initialItems?: ServiceItem[];        // seed rows
  draftStatus?: "saved" | "saving" | "offline";
  lastSavedLabel?: string;             // e.g. "2 minutes ago"
  onSave?: (items: ServiceItem[]) => Promise<void>;
  id?: string;                         // anchor for deep linking
}
```

### `ServiceItem`

```ts
type ServiceItem = {
  id: string;                          // stable id, generated client-side
  title: string;                       // 1–60 chars
  description: string;                 // 0–280 chars
  basePriceXLM: number;                // >= 0, ≤ 1 000 000, decimals OK
  durationMinutes: number;             // multiple of 15, ≥ 15
};
```

The hook `useServicesStep` is exported for advanced consumers who want to
manage the items array themselves (e.g. wiring to a remote query). It exposes
`addItem`, `removeItem`, `duplicateItem`, `moveItemUp`, `moveItemDown`,
`moveItem`, `updateItem`, `reset`, `isValid`, `canAdd`, and `errorsById`.

---

## Accessibility (WCAG 2.1 AA)

| Concern              | Implementation |
|----------------------|----------------|
| **Keyboard**         | Add / Save / Delete buttons are real `<button>`s. Each row exposes Up / Down / Duplicate / Delete buttons that are all focus targets. The Add button has an explicit `aria-label` ("Add a new service to the list"). |
| **Reorder feedback** | Up / Down button `aria-label`s include the service title and current 1-based position. The `aria-keyshortcuts="ArrowUp"` / `ArrowDown` attributes announce the shortcut for mouse users who probe the tooltip layer. |
| **Drag handle**      | A visible "grip" icon exists for visual affordance and the title `Drag to reorder`. It is `aria-hidden`. The canonical keyboard reorder is the Up / Down buttons — drag-and-drop itself is a **decorative** nicety (a real framer-motion drag binding can be layered later without harm). |
| **Live region**      | A polite `role="status"` live region announces add / remove / duplicate / move events with a sentence describing the change. |
| **Focus management** | No focus trap — this is a non-modal panel. After Delete, focus stays on the now-removed button (which is replaced one row up). This matches the `[WAI-ARIA Authoring Practices]` for non-modal edits. |
| **Validation**       | Each invalid input has `aria-invalid="true"` and `aria-describedby` pointing to a `<p role="alert">` element that explains the error. Toolbar summary re-states the row-count error so screen-reader users hear the headline quickly. |
| **Color contrast**   | Cyan-300 focus rings on a slate-950 background exceed AA (≥ 7 : 1). Rose-300 error text on the same surface clears 4.5 : 1. |
| **Empty state**      | Rendered via `<EmptyStateCard>` so the same accessibility and copy rules from `docs/empty-state-guidelines.md` apply. |
| **Reduced motion**   | framer-motion animations honour `prefers-reduced-motion: reduce` automatically. |
| **Touch targets**    | All buttons are ≥ 1.625rem (26 px) tall, exceeding the 24 × 24 px WCAG AA minimum. |
| **RTL**              | All margins, paddings, and text alignment use Tailwind *logical* classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`). The drag-handle sits on the start edge and action buttons right-align in LTR / left-align in RTL. |

### Full keyboard map

| Key              | Action                                                |
|------------------|-------------------------------------------------------|
| `Tab`            | Move between rows and into the Save button.           |
| `Shift+Tab`      | Move backwards through the same DOM order.            |
| `Enter` / `Space`| Activate the currently focused button.                |
| `ArrowUp` (info) | Hinted via `aria-keyshortcuts` on the Up button. The composable Up/Down buttons are the primary reorder mechanism — focusing one then pressing `Enter` is equivalent to pressing the arrow key. |

> **Why buttons instead of arrow-key handlers?** Arrow-key reorder handlers
> need a `tabindex` roving pattern across every row, which makes Tab order
> harder to predict and adds complexity to tests. Buttons provide an
> equivalent affordance, are easier to test, and keep the
> WCAG-aligned focus ring visible at all times.

---

## Validation rules

| Field            | Rule                                                         |
|------------------|--------------------------------------------------------------|
| `title`          | 1–60 characters after trimming.                              |
| `description`    | 0–280 characters.                                            |
| `basePriceXLM`   | ≥ 0 and ≤ 1 000 000. Two decimal places allowed.             |
| `durationMinutes`| ≥ 15 and a multiple of 15 (matches marketplace slot grids).  |

Invalid rows block the Save button (`aria-disabled="true"`) but never get
deleted automatically. Users can still reorder, duplicate, or focus the row
to fix it.

---

## Save lifecycle

The component is **uncontrolled**: items live in `useServicesStep`'s internal
state, and the parent only sees the latest snapshot when `onSave` resolves.

```
┌──────────┐   click   ┌──────────┐  await onSave  ┌──────────┐
│  Drafts  │ ────────▶ │  Save    │ ────────────▶ │  Toast   │
│  edit    │           │  button  │                │ success  │
└──────────┘           └──────────┘                └──────────┘
                            │
                            └── onSave rejected ─▶ ┌──────────┐
                                                     │  Toast   │
                                                     │  error   │
                                                     └──────────┘
```

`draftStatus` is a controlled prop surfaced in the header. It defaults to
`saved` and should be wired to the parent's autosave network state machine:

- **saved** — last write was acknowledged; show relative label
  ("2 minutes ago").
- **saving** — animates the chip to amber ("Saving…").
- **offline** — caller has detected lack of connectivity; show the neutral
  "Offline — changes local only" label.

This deliberately matches the rulebook in
[`docs/save-resume-drafts-ux.md`](../save-resume-drafts-ux.md).

---

## Animation & Motion

- Save button uses the existing `ButtonLink` primary variant — no custom
  motion.
- The overall component relies on `prefers-reduced-motion` from the existing
  framer-motion instances; no extra animation is registered.
- The drag handle is a static icon. If a future iteration brings in
  `framer-motion`'s `Reorder.Group`, motion is automatically reduced.

---

## Edge cases

| Case                             | Behaviour                                                          |
|----------------------------------|--------------------------------------------------------------------|
| 0 rows                           | `<EmptyStateCard>` directs the user to add their first service.     |
| 1 row, no other rows available   | Up/Down buttons are disabled — there is nothing to swap with.       |
| 20+ rows                         | Renders without warning, all 25 rows in the integration tests.     |
| Duplicate past the cap           | `canAdd = false` — both Add and Duplicate no-op.                   |
| Title `""` submitted             | Inline error "Title is required." + Save blocked.                  |
| Drag duration 17 minutes         | "Use 15-minute increments." + Save blocked.                        |
| Price written as text            | `parseNumber` falls back to 0 → "Price must be a positive number."  |
| `onSave` throws                  | Toast surfaces `error`, button returns to idle.                    |
| Network offline                  | Caller passes `draftStatus="offline"` → neutral chip.              |

---

## Testing strategy

Three test files target layers of the implementation:

| File                                                           | Focus |
|----------------------------------------------------------------|-------|
| `use-services-step.test.ts`                                    | Reducer + validation in isolation. 100% line coverage. |
| `service-row.test.tsx` *(recommended addition)*                | Per-row rendering + action affordances. |
| `index.test.tsx`                                               | Container + integration with `ToastProvider`. |

Coverage thresholds live in [`vitest.config.ts`](../../vitest.config.ts)
(95 % lines / statements / functions, 90 % branches).

Fake timers are **not** required — the component does not own a timer; the
parent supplies the lifecycle.

---

## Related docs

- [`panel-shell.md`](../../src/components/dashboard/panel-shell.tsx) — header primitive
- [`empty-state-guidelines.md`](../empty-state-guidelines.md) — empty-state copy & illustration rules
- [`toast-feedback-system.md`](../toast-feedback-system.md) — toast contract used by the Save button
- [`save-resume-drafts-ux.md`](../save-resume-drafts-ux.md) — draft status surfacing
- [`design-review-checklist.md`](../design-review-checklist.md) — pre-PR checklist
- [`glossary.ts`](../../src/lib/glossary.ts) — `basePrice` and `sessionDuration` definitions
