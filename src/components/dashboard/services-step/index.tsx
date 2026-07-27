"use client";

/**
 * ServicesStep
 *
 * The "Services & Pricing" step in the supplier onboarding flow. Renders a
 * panel that lets suppliers list their services with a base price, duration,
 * description, and reorder / duplicate / delete actions.
 *
 * State is managed locally via `useServicesStep` so this component stays a
 * thin orchestrator. The save lifecycle is exposed through `onSave` and the
 * draft status (similar in spirit to `docs/save-resume-drafts-ux.md`) is
 * surfaced in the header.
 *
 * Accessibility highlights:
 *   - `PanelShell` provides header semantics + eyebrow + description.
 *   - `aria-live` live region announces add / remove / duplicate events.
 *   - The Save button toggles `aria-busy` + uses the existing `useToast`
 *     feedback system on resolve / failure.
 *   - Empty state reuses `EmptyStateCard` for parity with the rest of the
 *     dashboard.
 *   - Repeater rows expose a 1-based `aria-label` for screen readers.
 *   - Each row is HTML5-draggable; explicit Up / Down buttons remain the
 *     canonical keyboard reorder path so screen-reader and keyboard users
 *     never depend on the drag interaction.
 */

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { PanelShell } from "../panel-shell";
import { StatusChip } from "../status-chip";
import { ButtonLink } from "@/app/components/ui/button-link";
import { EmptyStateCard } from "@/app/components/empty-state-card";
import { useToast } from "@/hooks/use-toast";
import { LiveRegion } from "@/components/common/LiveRegion";
import { ServiceRow } from "./service-row";
import {
  useServicesStep,
  validateRow,
  type ServiceItemField,
} from "./use-services-step";
import type { DraftStatus, ServiceItem, Tone } from "../types";

export type ServicesStepProps = {
  initialItems?: ServiceItem[];
  /** Indicates the current persistence state of the supplier's draft. */
  draftStatus?: DraftStatus;
  /** Last-saved timestamp formatted for display (e.g. "2 minutes ago"). */
  lastSavedLabel?: string;
  /** Async save handler invoked when the user presses the Save button. */
  onSave?: (items: ServiceItem[]) => Promise<void>;
  /** Element id used so a launcher button can deep-link to the panel. */
  id?: string;
};

// Tone mapping keeps the StatusChip aesthetic consistent with the dashboard.
// Dashboard's `status-chip` consumes the `Tone` union from `types.ts`:
// { neutral | positive | warning | critical }.
const draftStatusTone: Record<DraftStatus, Tone> = {
  saved: "positive",
  saving: "warning",
  offline: "neutral",
};

const draftStatusLabel: Record<DraftStatus, string> = {
  saved: "Saved as draft",
  saving: "Saving…",
  offline: "Offline — changes local only",
};

export function ServicesStep({
  initialItems = [],
  draftStatus = "saved",
  lastSavedLabel,
  onSave,
  id,
}: ServicesStepProps) {
  const { toast } = useToast();
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const itemsState = useServicesStep({ initialItems });

  const {
    items,
    errorsById,
    isValid,
    canAdd,
    addItem,
    removeItem,
    duplicateItem,
    moveItem,
    moveItemUp,
    moveItemDown,
    updateItem,
  } = itemsState;

  // Clear pending announcement on unmount so the timer doesn't fire later.
  useEffect(() => {
    return () => {
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
      }
    };
  }, []);

  /**
   * Push a screen-reader announcement. We clear it shortly afterwards so
   * back-to-back identical events (e.g. two consecutive move-ups on the
   * same row) still re-announce.
   */
  const announce = (message: string) => {
    setAnnouncement("");
    if (announcementTimerRef.current) {
      clearTimeout(announcementTimerRef.current);
    }
    // Two ticks let React flush the cleared string first, then the new text,
    // so sr-only live regions reliably re-announce even on repeated text.
    requestAnimationFrame(() => {
      setAnnouncement(message);
      announcementTimerRef.current = setTimeout(
        () => setAnnouncement(""),
        1500,
      );
    });
  };

  // ── Handlers that also fire announcements for screen-reader users ────────

  const handleAdd = (seed?: Partial<ServiceItem>) => {
    addItem(seed);
    announce("New service added at the end of the list.");
  };

  const handleRemove = (id: string) => {
    const target = items.find((item) => item.id === id);
    removeItem(id);
    if (target) {
      announce(`${target.title || "Service"} removed from the list.`);
    }
  };

  const handleDuplicate = (id: string) => {
    const source = items.find((item) => item.id === id);
    duplicateItem(id);
    if (source) {
      announce(
        `${source.title || "Service"} duplicated. The copy was inserted directly below the original.`,
      );
    }
  };

  const handleMoveUp = (id: string) => {
    const oldIndex = items.findIndex((item) => item.id === id);
    if (oldIndex <= 0) return;
    moveItemUp(id);
    // After moving up, the item sits at 1-based position `oldIndex`.
    const title = items[oldIndex]?.title || `Service ${oldIndex + 1}`;
    announce(`${title} moved up to position ${oldIndex}.`);
  };

  const handleMoveDown = (id: string) => {
    const oldIndex = items.findIndex((item) => item.id === id);
    if (oldIndex < 0 || oldIndex >= items.length - 1) return;
    moveItemDown(id);
    // After moving down, the item sits at 1-based position `oldIndex + 2`.
    const title = items[oldIndex]?.title || `Service ${oldIndex + 1}`;
    announce(`${title} moved down to position ${oldIndex + 2}.`);
  };

  const handleUpdate = (
    id: string,
    field: ServiceItemField,
    value: string,
  ) => {
    updateItem(id, field, value);
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };
  const handleDragEnd = () => {
    setDraggingId(null);
  };
  const handleDropReorder = (fromId: string, toId: string) => {
    const fromIndex = items.findIndex((it) => it.id === fromId);
    const toIndex = items.findIndex((it) => it.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    moveItem(fromIndex, toIndex);
    const title = items[fromIndex]?.title || `Service ${fromIndex + 1}`;
    announce(
      `${title} moved to position ${toIndex + 1} by drag-and-drop.`,
    );
    setDraggingId(null);
  };

  const handleSave = async () => {
    if (!onSave || busy) return;
    // Defence-in-depth: the Save button is also `disabled` when invalid,
    // but guard here too in case a pointer event bypasses the disabled
    // attribute (e.g. assistive-tech tools that fire click synthetically).
    if (!isValid) {
      toast({
        variant: "warning",
        title: "Fix errors before saving",
        description: "One or more services still have invalid fields.",
      });
      return;
    }
    setBusy(true);
    try {
      await onSave(items);
      toast({
        variant: "success",
        title: "Services saved",
        description: `${items.length} service${
          items.length === 1 ? "" : "s"
        } saved to your draft.`,
        duration: 4000,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Could not save services",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = items.length === 0;
  const errorCount = items.reduce(
    (sum, item) =>
      sum + (errorsById[item.id] && !errorsById[item.id].valid ? 1 : 0),
    0,
  );

  return (
    <PanelShell
      id={id}
      eyebrow="Step 2 of 4"
      title="Services & pricing"
      description="Add the services you sell, set a base price in XLM, pick a session duration, and describe what each session delivers. You can reorder, duplicate, and delete entries as you go."
      action={
        <StatusChip tone={draftStatusTone[draftStatus]}>
          {draftStatusLabel[draftStatus]}
          {draftStatus === "saved" && lastSavedLabel
            ? ` · ${lastSavedLabel}`
            : ""}
        </StatusChip>
      }
    >
      <div className="space-y-5">
        {/* Toolbar: row count + validation summary + Add service */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            aria-live="polite"
            aria-atomic="true"
            data-testid="services-step-validation-summary"
            className="text-xs text-slate-400"
          >
            {items.length} of {30} services ·{" "}
            {isValid ? (
              <span className="text-emerald-300">all valid</span>
            ) : (
              <span className="text-rose-300">
                {errorCount} row{errorCount === 1 ? "" : "s"} need attention
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={!canAdd}
            data-testid="services-step-add"
            aria-label="Add a new service to the list"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add service
          </button>
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <EmptyStateCard
            eyebrow="Services"
            title="No services yet"
            description="Add at least one service so buyers know what you offer. You can refine price, duration, and description after the first save."
            accentLabel="Services"
            status={{ label: "Empty", tone: "neutral" }}
            guidance={[
              "Lead with your strongest, best-priced service so buyers see it first.",
              "Group similar 1:1 offerings (e.g. coaching, review sessions) into separate rows for cleaner filtering.",
              "You can edit every field after you save — drafts never go live until you publish.",
            ]}
            actions={
              <button
                type="button"
                onClick={() => handleAdd({ title: "" })}
                data-testid="services-step-empty-add"
                className="focus-ring-cyan inline-flex items-center justify-center rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
              >
                Add your first service
              </button>
            }
          />
        ) : (
          <ul
            data-testid="services-step-list"
            aria-label="Services list — reorder with the up and down buttons or by dragging a row"
            className="space-y-4"
          >
            {items.map((item, index) => (
              <ServiceRow
                key={item.id}
                index={index}
                item={item}
                validation={errorsById[item.id] ?? validateRow(item)}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onDuplicate={handleDuplicate}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDropReorder={handleDropReorder}
                highlight={draggingId === item.id}
              />
            ))}
          </ul>
        )}

        {/* Footer: Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <p className="text-xs text-slate-400">
            Drafts autosave locally and sync to your supplier profile when
            you&apos;re back online.
          </p>
          {onSave ? (
            <ButtonLink
              href="#saved"
              variant="primary"
              size="md"
              disabled={busy || !isValid}
              loading={busy}
              data-state={busy ? "busy" : "idle"}
              data-testid="services-step-save"
              aria-busy={busy || undefined}
              onClick={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              {busy ? "Saving…" : "Save draft"}
            </ButtonLink>
          ) : null}
        </div>

        {/* Live announcements — describes reorder / duplicate / remove events.
            Wrapped in a div with a stable testid so tests can target it
            precisely without colliding with per-row status elements. */}
        <div data-testid="services-step-live-region" className="sr-only">
          <LiveRegion ariaLive="polite">{announcement}</LiveRegion>
        </div>
      </div>
    </PanelShell>
  );
}

// Re-export so consumers can import everything from the module path.
export {
  useServicesStep,
  validateRow,
  SERVICES_STEP_LIMITS,
  type ServiceItemField,
} from "./use-services-step";
export type { ServiceRowProps } from "./service-row";
