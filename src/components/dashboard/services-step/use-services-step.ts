/**
 * useServicesStep
 *
 * State-management hook for the "Services & Pricing" supplier onboarding step.
 *
 * Handles:
 *   - Adding a fresh service row (auto-assigns a stable id)
 *   - Removing a row by id
 *   - Duplicating a row (creates a new id, appends "{name} (copy)")
 *   - Reordering via explicit indices (used by the up/down arrow buttons)
 *   - Updating a single field on a row
 *   - Per-row validation (title, base price, duration)
 *
 * Ids are generated client-side with a monotonic counter to remain stable
 * across renders. Tests that pass their own ids via the optional seed
 * parameter benefit from deterministic assertions.
 */

import { useCallback, useMemo, useReducer } from "react";
import type { ServiceItem } from "../types";

/**
 * Validation rules. Returned alongside the items so the UI can surface
 * `aria-invalid` and helper text without re-implementing the checks.
 */
export const SERVICES_STEP_LIMITS = {
  titleMaxLength: 60,
  titleMinLength: 1,
  basePriceMin: 0,
  basePriceMax: 1_000_000,
  durationMin: 15,
  /** Duration must be a multiple of 15 minutes to align with slot grids. */
  durationStep: 15,
  descriptionMaxLength: 280,
  maxItems: 30,
} as const;

export type ServiceItemField = keyof Omit<ServiceItem, "id">;

/**
 * Validation result for a single row. `valid` is true only when every field
 * passes; otherwise `errors` maps field name → reason string.
 */
export type RowValidation = {
  valid: boolean;
  errors: Partial<Record<ServiceItemField, string>>;
};

export type UseServicesStepOptions = {
  /** Initial rows to seed the state. Reset when the seed reference changes. */
  initialItems?: ServiceItem[];
  /** Optional id generator — useful for tests to keep ids deterministic. */
  createId?: () => string;
};

export type UseServicesStepResult = {
  items: ServiceItem[];
  errorsById: Record<string, RowValidation>;
  isValid: boolean;
  canAdd: boolean;

  addItem: (seed?: Partial<ServiceItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  /** Move the row at `fromIndex` to `toIndex`. No-op if out-of-bounds. */
  moveItem: (fromIndex: number, toIndex: number) => void;
  moveItemUp: (id: string) => void;
  moveItemDown: (id: string) => void;
  updateItem: (id: string, field: ServiceItemField, value: string) => void;
  reset: (next?: ServiceItem[]) => void;
};

// ─── Internal reducer ────────────────────────────────────────────────────────

type Action =
  | { type: "ADD"; item: ServiceItem }
  | { type: "REMOVE"; id: string }
  | { type: "DUPLICATE"; sourceId: string; item: ServiceItem }
  | { type: "MOVE"; fromIndex: number; toIndex: number }
  | { type: "UPDATE"; id: string; field: ServiceItemField; value: string }
  | { type: "RESET"; items: ServiceItem[] };

function reducer(state: ServiceItem[], action: Action): ServiceItem[] {
  switch (action.type) {
    case "ADD":
      return [...state, action.item];

    case "REMOVE":
      return state.filter((item) => item.id !== action.id);

    case "DUPLICATE": {
      const idx = state.findIndex((item) => item.id === action.sourceId);
      if (idx === -1) return state;
      // Insert the duplicate immediately after the source row
      return [
        ...state.slice(0, idx + 1),
        action.item,
        ...state.slice(idx + 1),
      ];
    }

    case "MOVE": {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.length ||
        toIndex >= state.length
      ) {
        return state;
      }
      const next = state.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    }

    case "UPDATE": {
      return state.map((item) =>
        item.id === action.id ? applyFieldUpdate(item, action.field, action.value) : item,
      );
    }

    case "RESET":
      return action.items;

    default:
      return state;
  }
}

function applyFieldUpdate(
  item: ServiceItem,
  field: ServiceItemField,
  rawValue: string,
): ServiceItem {
  switch (field) {
    case "title":
      return { ...item, title: rawValue };
    case "description":
      return { ...item, description: rawValue };
    case "basePriceXLM":
      return { ...item, basePriceXLM: parseNumber(rawValue, 0) };
    case "durationMinutes":
      return { ...item, durationMinutes: parseNumber(rawValue, 0) };
    default:
      return item;
  }
}

function parseNumber(raw: string, fallback: number): number {
  if (raw.trim() === "") return fallback;
  // Allow leading decimals like ".5" by prepending zero
  const normalised = raw.startsWith(".") ? `0${raw}` : raw;
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateRow(item: ServiceItem): RowValidation {
  const errors: RowValidation["errors"] = {};

  if (item.title.trim().length < SERVICES_STEP_LIMITS.titleMinLength) {
    errors.title = "Title is required.";
  } else if (item.title.length > SERVICES_STEP_LIMITS.titleMaxLength) {
    errors.title = `Title must be ${SERVICES_STEP_LIMITS.titleMaxLength} characters or fewer.`;
  }

  if (
    !Number.isFinite(item.basePriceXLM) ||
    item.basePriceXLM < SERVICES_STEP_LIMITS.basePriceMin
  ) {
    errors.basePriceXLM = "Price must be a positive number.";
  } else if (item.basePriceXLM > SERVICES_STEP_LIMITS.basePriceMax) {
    errors.basePriceXLM = "Price is too large.";
  }

  if (
    !Number.isFinite(item.durationMinutes) ||
    item.durationMinutes < SERVICES_STEP_LIMITS.durationMin
  ) {
    errors.durationMinutes = `Duration must be at least ${SERVICES_STEP_LIMITS.durationMin} minutes.`;
  } else if (item.durationMinutes % SERVICES_STEP_LIMITS.durationStep !== 0) {
    errors.durationMinutes = `Use ${SERVICES_STEP_LIMITS.durationStep}-minute increments.`;
  }

  if (
    item.description.length > SERVICES_STEP_LIMITS.descriptionMaxLength
  ) {
    errors.description = `Description must be ${SERVICES_STEP_LIMITS.descriptionMaxLength} characters or fewer.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const defaultCreateId = () => {
  // Fallback for browsers lacking crypto.randomUUID
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `svc-${crypto.randomUUID()}`;
  }
  return `svc-${Math.random().toString(36).slice(2, 10)}`;
};

export function useServicesStep(
  options: UseServicesStepOptions = {},
): UseServicesStepResult {
  const { initialItems = [], createId = defaultCreateId } = options;

  const [items, dispatch] = useReducer(reducer, initialItems);

  const errorsById = useMemo(() => {
    const map: Record<string, RowValidation> = {};
    for (const item of items) {
      map[item.id] = validateRow(item);
    }
    return map;
  }, [items]);

  const isValid = useMemo(
    () => items.every((item) => errorsById[item.id]?.valid ?? false),
    [items, errorsById],
  );

  const canAdd = items.length < SERVICES_STEP_LIMITS.maxItems;

  const addItem = useCallback(
    (seed?: Partial<ServiceItem>) => {
      if (!canAdd) return;
      const id = createId();
      const item: ServiceItem = {
        id,
        title: seed?.title ?? "",
        description: seed?.description ?? "",
        basePriceXLM: seed?.basePriceXLM ?? 0,
        durationMinutes: seed?.durationMinutes ?? SERVICES_STEP_LIMITS.durationMin,
      };
      dispatch({ type: "ADD", item });
    },
    [canAdd, createId],
  );

  const removeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  const duplicateItem = useCallback(
    (sourceId: string) => {
      if (!canAdd) return;
      const source = items.find((item) => item.id === sourceId);
      if (!source) return;
      const id = createId();
      dispatch({
        type: "DUPLICATE",
        sourceId,
        item: { ...source, id, title: appendCopySuffix(source.title) },
      });
    },
    [canAdd, createId, items],
  );

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "MOVE", fromIndex, toIndex });
  }, []);

  const moveItemUp = useCallback(
    (id: string) => {
      const idx = items.findIndex((item) => item.id === id);
      if (idx > 0) dispatch({ type: "MOVE", fromIndex: idx, toIndex: idx - 1 });
    },
    [items],
  );

  const moveItemDown = useCallback(
    (id: string) => {
      const idx = items.findIndex((item) => item.id === id);
      if (idx >= 0 && idx < items.length - 1) {
        dispatch({ type: "MOVE", fromIndex: idx, toIndex: idx + 1 });
      }
    },
    [items],
  );

  const updateItem = useCallback(
    (id: string, field: ServiceItemField, value: string) => {
      dispatch({ type: "UPDATE", id, field, value });
    },
    [],
  );

  const reset = useCallback((next?: ServiceItem[]) => {
    dispatch({ type: "RESET", items: next ?? [] });
  }, []);

  return {
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
    reset,
  };
}

function appendCopySuffix(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return "New service (copy)";
  // Strip a trailing "(copy)" — possibly with whitespace — so repeated
  // duplicates do not produce "Foo (copy) (copy) (copy)".
  const stripped = trimmed.replace(/\s*\(copy\)\s*$/i, "").trim();
  return stripped.length === 0
    ? "New service (copy)"
    : `${stripped} (copy)`;
}
