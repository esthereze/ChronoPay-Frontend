"use client";

/**
 * ServiceRow
 *
 * A single row inside the services-and-pricing repeater. The row is a
 * keyboard- and screen-reader-accessible area with:
 *
 *  - A visible drag handle (decorative; the actual reorder is driven by the
 *    explicit up/down buttons which are the canonical keyboard path).
 *  - Up / Down buttons with descriptive aria-labels that include the row
 *    position. They are the primary keyboard-friendly reorder mechanism.
 *  - A Duplicate button that clones the row with a "(copy)" suffix.
 *  - A Delete button that removes the row (with `aria-label` including the
 *    service title so screen readers never hear the generic "Delete").
 *  - Inline validation: each input reports `aria-invalid` and the row
 *    aggregates errors into a single live region for screen-reader users.
 *
 * Stateless — the row receives the item snapshot, validation, and the four
 * action callbacks from the parent `ServicesStep` so it can stay decoupled
 * from the hook implementation.
 */

import { useId } from "react";
import { GripVertical, ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";
import { HelpPopover } from "@/app/components/ui/help-popover";
import { glossary } from "@/lib/glossary";
import { SERVICES_STEP_LIMITS, type ServiceItemField, type RowValidation } from "./use-services-step";
import type { ServiceItem } from "../types";

export type ServiceRowProps = {
  /** Zero-based index — used for position-aware aria labels. */
  index: number;
  item: ServiceItem;
  validation: RowValidation;
  isFirst: boolean;
  isLast: boolean;
  /** When true, applies a cyan ring around the row to indicate "dragging". */
  highlight?: boolean;
  onUpdate: (id: string, field: ServiceItemField, value: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Fired on row `dragstart`. Parent can use it to highlight drop targets. */
  onDragStart?: (id: string) => void;
  /** Fired when the row receives a drop from another row. */
  onDropReorder?: (fromId: string, toId: string) => void;
  /** Fired on row `dragend` regardless of drop outcome. */
  onDragEnd?: () => void;
};

export function ServiceRow({
  index,
  item,
  validation,
  isFirst,
  isLast,
  highlight = false,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDropReorder,
  onDragEnd,
}: ServiceRowProps) {
  const baseId = useId();
  const rowId = `${baseId}-row`;
  const titleId = `${baseId}-title`;
  const titleErrorId = `${baseId}-title-error`;
  const priceId = `${baseId}-price`;
  const priceErrorId = `${baseId}-price-error`;
  const durationId = `${baseId}-duration`;
  const durationErrorId = `${baseId}-duration-error`;
  const descId = `${baseId}-description`;
  const descErrorId = `${baseId}-description-error`;
  const liveId = `${baseId}-live`;

  const safeTitle = item.title.trim() || `Service ${index + 1}`;
  const position = index + 1;

  return (
    <li
      id={rowId}
      data-testid="services-step-row"
      data-row-index={position}
      aria-labelledby={titleId}
      aria-describedby={liveId}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${
        highlight ? "ring-1 ring-cyan-300/40" : ""
      }`}
      draggable
      onDragStart={(event) => {
        // Use plain-text payload to satisfy HTML5 dnd; some browsers ignore
        // custom MIME types. We also stash the id in the event for our own
        // drop logic since the dataTransfer text is read-only on drop.
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart?.(item.id);
      }}
      onDragOver={(event) => {
        // Required to mark the row as a valid drop target.
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const fromId = event.dataTransfer.getData("text/plain");
        if (fromId && fromId !== item.id) {
          onDropReorder?.(fromId, item.id);
        }
      }}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Reorder affordance — the whole row is draggable (Html5 dnd),
            with explicit Up / Down buttons below as the canonical
            keyboard path and screen-reader hint. The GripVertical icon
            is purely decorative so sighted users see where to grab. */}
        <span
          className="mt-1 inline-flex h-9 w-9 flex-shrink-0 cursor-grab items-center justify-center rounded-lg border border-white/8 bg-white/4 text-slate-400"
          data-testid="services-step-drag-handle"
          aria-hidden="true"
          title="Drag to reorder, or use the up and down buttons below"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1 space-y-4">
          {/* Title row */}
          <div>
            <label
              htmlFor={titleId}
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              Service title
            </label>
            <input
              id={titleId}
              data-testid="services-step-title"
              type="text"
              value={item.title}
              onChange={(e) => onUpdate(item.id, "title", e.target.value)}
              maxLength={SERVICES_STEP_LIMITS.titleMaxLength}
              placeholder="e.g. Product strategy call"
              aria-invalid={Boolean(validation.errors.title)}
              aria-describedby={
                validation.errors.title ? titleErrorId : undefined
              }
              className={inputClass(Boolean(validation.errors.title))}
            />
            {validation.errors.title ? (
              <p
                id={titleErrorId}
                role="alert"
                className="mt-1 text-xs text-rose-300"
              >
                {validation.errors.title}
              </p>
            ) : null}
          </div>

          {/* Price + Duration row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={priceId}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
              >
                Base price (XLM)
                <HelpPopover
                  term={glossary.basePrice}
                  triggerLabel="Help: what is the base price?"
                />
              </label>
              <input
                id={priceId}
                data-testid="services-step-price"
                type="number"
                inputMode="decimal"
                min={SERVICES_STEP_LIMITS.basePriceMin}
                step="0.01"
                value={Number.isFinite(item.basePriceXLM) ? item.basePriceXLM : 0}
                onChange={(e) => onUpdate(item.id, "basePriceXLM", e.target.value)}
                aria-invalid={Boolean(validation.errors.basePriceXLM)}
                aria-describedby={
                  validation.errors.basePriceXLM ? priceErrorId : undefined
                }
                className={inputClass(Boolean(validation.errors.basePriceXLM))}
              />
              {validation.errors.basePriceXLM ? (
                <p
                  id={priceErrorId}
                  role="alert"
                  className="mt-1 text-xs text-rose-300"
                >
                  {validation.errors.basePriceXLM}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor={durationId}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
              >
                Duration (minutes)
                <HelpPopover
                  term={glossary.sessionDuration}
                  triggerLabel="Help: how should I pick a duration?"
                />
              </label>
              <input
                id={durationId}
                data-testid="services-step-duration"
                type="number"
                inputMode="numeric"
                min={SERVICES_STEP_LIMITS.durationMin}
                step={SERVICES_STEP_LIMITS.durationStep}
                value={
                  Number.isFinite(item.durationMinutes)
                    ? item.durationMinutes
                    : 0
                }
                onChange={(e) =>
                  onUpdate(item.id, "durationMinutes", e.target.value)
                }
                aria-invalid={Boolean(validation.errors.durationMinutes)}
                aria-describedby={
                  validation.errors.durationMinutes ? durationErrorId : undefined
                }
                className={inputClass(
                  Boolean(validation.errors.durationMinutes),
                )}
              />
              {validation.errors.durationMinutes ? (
                <p
                  id={durationErrorId}
                  role="alert"
                  className="mt-1 text-xs text-rose-300"
                >
                  {validation.errors.durationMinutes}
                </p>
              ) : null}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor={descId}
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
            >
              Description
            </label>
            <textarea
              id={descId}
              data-testid="services-step-description"
              value={item.description}
              onChange={(e) => onUpdate(item.id, "description", e.target.value)}
              maxLength={SERVICES_STEP_LIMITS.descriptionMaxLength}
              rows={3}
              placeholder="What buyers get out of this session…"
              aria-invalid={Boolean(validation.errors.description)}
              aria-describedby={
                validation.errors.description ? descErrorId : undefined
              }
              className={inputClass(Boolean(validation.errors.description)) + " min-h-[5rem] resize-y"}
            />
            {validation.errors.description ? (
              <p
                id={descErrorId}
                role="alert"
                className="mt-1 text-xs text-rose-300"
              >
                {validation.errors.description}
              </p>
            ) : null}
          </div>

          {/* Accessible live region: announces row-level state changes
              (reorder, delete) for screen-reader users. */}
          <p id={liveId} className="sr-only" role="status" aria-live="polite">
            Row {position}: {safeTitle}
            {validation.valid ? "" : " has validation errors"}
          </p>

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
            <div className="flex items-center gap-1.5">
              <IconAction
                label={`Move ${safeTitle} up (currently position ${position})`}
                disabled={isFirst}
                onClick={() => onMoveUp(item.id)}
                testId="services-step-move-up"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Up</span>
              </IconAction>
              <IconAction
                label={`Move ${safeTitle} down (currently position ${position})`}
                disabled={isLast}
                onClick={() => onMoveDown(item.id)}
                testId="services-step-move-down"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Down</span>
              </IconAction>
              <IconAction
                label={`Duplicate ${safeTitle}`}
                onClick={() => onDuplicate(item.id)}
                testId="services-step-duplicate"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Duplicate</span>
              </IconAction>
            </div>
            <IconAction
              label={`Delete ${safeTitle}`}
              tone="danger"
              onClick={() => onRemove(item.id)}
              testId="services-step-delete"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Delete</span>
            </IconAction>
          </div>
        </div>
      </div>
    </li>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function inputClass(invalid: boolean): string {
  const base =
    "mt-1 block w-full rounded-xl border bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950";
  const border = invalid
    ? "border-rose-400/60"
    : "border-white/10 hover:border-white/20";
  return `${base} ${border}`;
}

function IconAction({
  children,
  label,
  tone = "neutral",
  disabled = false,
  onClick,
  testId,
}: {
  children: React.ReactNode;
  label: string;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onClick: () => void;
  testId: string;
}) {
  const palette =
    tone === "danger"
      ? "border-rose-400/30 text-rose-200 hover:bg-rose-500/10 focus-visible:ring-rose-300"
      : "border-white/10 text-slate-200 hover:bg-white/8 focus-visible:ring-cyan-300";
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-full border bg-white/4 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : palette
      }`}
    >
      {children}
    </button>
  );
}
