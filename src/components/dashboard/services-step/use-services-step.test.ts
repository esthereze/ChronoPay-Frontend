import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useServicesStep,
  validateRow,
  SERVICES_STEP_LIMITS,
} from "./use-services-step";
import type { ServiceItem } from "../types";

const sample = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "svc-test",
  title: "Strategy call",
  description: "A focused 60-minute session.",
  basePriceXLM: 100,
  durationMinutes: 60,
  ...overrides,
});

// Deterministic id generator so tests assert exact ids without flakes.
let counter = 0;
const makeId = () => {
  counter += 1;
  return `svc-test-${counter}`;
};

describe("validateRow", () => {
  it("returns valid for a fully-populated row", () => {
    const result = validateRow(sample());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("flags a missing title", () => {
    const result = validateRow(sample({ title: "" }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
  });

  it("flags a whitespace-only title", () => {
    const result = validateRow(sample({ title: "   " }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
  });

  it("flags an over-long title", () => {
    const result = validateRow(sample({ title: "x".repeat(61) }));
    expect(result.valid).toBe(false);
    expect(result.errors.title).toMatch(/60 characters/);
  });

  it("accepts the maximum title length", () => {
    const result = validateRow(sample({ title: "x".repeat(60) }));
    expect(result.errors.title).toBeUndefined();
  });

  it("flags negative price", () => {
    const result = validateRow(sample({ basePriceXLM: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.basePriceXLM).toMatch(/positive/);
  });

  it("flags a price above the ceiling", () => {
    const result = validateRow(
      sample({ basePriceXLM: SERVICES_STEP_LIMITS.basePriceMax + 1 }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.basePriceXLM).toMatch(/too large/);
  });

  it("accepts zero price (free sessions)", () => {
    const result = validateRow(sample({ basePriceXLM: 0 }));
    expect(result.errors.basePriceXLM).toBeUndefined();
  });

  it("accepts price with two decimal places", () => {
    const result = validateRow(sample({ basePriceXLM: 99.99 }));
    expect(result.errors.basePriceXLM).toBeUndefined();
  });

  it("flags short duration", () => {
    const result = validateRow(sample({ durationMinutes: 5 }));
    expect(result.valid).toBe(false);
    expect(result.errors.durationMinutes).toMatch(/at least 15/);
  });

  it("flags duration not aligned to 15-minute steps", () => {
    const result = validateRow(sample({ durationMinutes: 17 }));
    expect(result.valid).toBe(false);
    expect(result.errors.durationMinutes).toMatch(/15-minute/);
  });

  it("accepts 15-minute-aligned durations", () => {
    expect(
      validateRow(sample({ durationMinutes: 15 })).errors.durationMinutes,
    ).toBeUndefined();
    expect(
      validateRow(sample({ durationMinutes: 45 })).errors.durationMinutes,
    ).toBeUndefined();
    expect(
      validateRow(sample({ durationMinutes: 90 })).errors.durationMinutes,
    ).toBeUndefined();
  });

  it("flags over-long descriptions", () => {
    const result = validateRow(
      sample({
        description: "x".repeat(SERVICES_STEP_LIMITS.descriptionMaxLength + 1),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.description).toMatch(/280/);
  });

  it("can report multiple errors at once", () => {
    const result = validateRow(
      sample({ title: "", basePriceXLM: -5, durationMinutes: 5 }),
    );
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(3);
  });
});

describe("useServicesStep", () => {
  beforeEach(() => {
    counter = 0;
  });

  it("starts with the seeded items", () => {
    const { result } = renderHook(() =>
      useServicesStep({ initialItems: [sample()], createId: makeId }),
    );
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].id).toBe("svc-test");
  });

  it("starts empty when no seed is provided", () => {
    const { result } = renderHook(() => useServicesStep({ createId: makeId }));
    expect(result.current.items).toEqual([]);
    expect(result.current.canAdd).toBe(true);
    expect(result.current.isValid).toBe(true); // 0 items is trivially valid
  });

  describe("addItem", () => {
    it("appends an empty row by default", () => {
      const { result } = renderHook(() =>
        useServicesStep({ createId: makeId }),
      );
      act(() => result.current.addItem());
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0]).toMatchObject({
        title: "",
        description: "",
        basePriceXLM: 0,
        durationMinutes: SERVICES_STEP_LIMITS.durationMin,
      });
      expect(result.current.isValid).toBe(false); // empty title
    });

    it("appends with seed values", () => {
      const { result } = renderHook(() =>
        useServicesStep({ createId: makeId }),
      );
      act(() =>
        result.current.addItem({
          title: "Coaching session",
          basePriceXLM: 50,
          durationMinutes: 30,
        }),
      );
      expect(result.current.items[0].title).toBe("Coaching session");
      expect(result.current.items[0].basePriceXLM).toBe(50);
    });

    it("blocks addItem once the cap is reached", () => {
      const many = Array.from(
        { length: SERVICES_STEP_LIMITS.maxItems },
        (_, i) => sample({ id: `svc-${i}` }),
      );
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: many, createId: makeId }),
      );
      expect(result.current.canAdd).toBe(false);
      act(() => result.current.addItem());
      expect(result.current.items.length).toBe(SERVICES_STEP_LIMITS.maxItems);
    });
  });

  describe("removeItem", () => {
    it("removes the matching row", () => {
      const seeded = [sample({ id: "a" }), sample({ id: "b" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.removeItem("a"));
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].id).toBe("b");
    });

    it("ignores unknown ids", () => {
      const seeded = [sample({ id: "a" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.removeItem("does-not-exist"));
      expect(result.current.items.length).toBe(1);
    });
  });

  describe("duplicateItem", () => {
    it("clones the source row with a new id and '(copy)' suffix", () => {
      const seeded = [sample({ id: "a", title: "Coaching" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.duplicateItem("a"));
      expect(result.current.items.length).toBe(2);
      const [original, copy] = result.current.items;
      expect(original.id).toBe("a");
      expect(copy.id).toBe("svc-test-1");
      expect(copy.title).toBe("Coaching (copy)");
      expect(copy.basePriceXLM).toBe(original.basePriceXLM);
      expect(copy.durationMinutes).toBe(original.durationMinutes);
    });

    it("appends '(copy)' to empty titles with a fall-back label", () => {
      const seeded = [sample({ id: "a", title: "" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.duplicateItem("a"));
      expect(result.current.items[1].title).toBe("New service (copy)");
    });

    it("places the duplicate immediately after the source", () => {
      const seeded = [
        sample({ id: "a", title: "A" }),
        sample({ id: "b", title: "B" }),
        sample({ id: "c", title: "C" }),
      ];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.duplicateItem("b"));
      expect(result.current.items.map((item) => item.id)).toEqual([
        "a",
        "b",
        "svc-test-1",
        "c",
      ]);
    });

    it("ignores unknown source ids", () => {
      const { result } = renderHook(() =>
        useServicesStep({
          initialItems: [sample({ id: "a" })],
          createId: makeId,
        }),
      );
      act(() => result.current.duplicateItem("unknown"));
      expect(result.current.items.length).toBe(1);
    });

    it("strips a trailing '(copy)' before re-appending it", () => {
      const seeded = [sample({ id: "a", title: "Coaching (copy)" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.duplicateItem("a"));
      // Without the strip, this would be "Coaching (copy) (copy)".
      expect(result.current.items[1].title).toBe("Coaching (copy)");
    });
  });

  describe("moveItemUp / moveItemDown", () => {
    it("swap position via moveItem", () => {
      const seeded = [
        sample({ id: "a", title: "A" }),
        sample({ id: "b", title: "B" }),
      ];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.moveItem(0, 1));
      expect(result.current.items.map((i) => i.id)).toEqual(["b", "a"]);
    });

    it("ignores out-of-bounds moveItem coordinates (over-length)", () => {
      const seeded = [sample({ id: "a" }), sample({ id: "b" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.moveItem(0, 10));
      expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("ignores out-of-bounds moveItem coordinates (negative)", () => {
      const seeded = [sample({ id: "a" }), sample({ id: "b" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      act(() => result.current.moveItem(-1, 1));
      expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("ignores same-index moveItem coordinates", () => {
      const seeded = [sample({ id: "a" }), sample({ id: "b" })];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      const before = result.current.items.slice();
      act(() => result.current.moveItem(0, 0));
      expect(result.current.items).toEqual(before);
    });

    it("moveItemUp swaps the row with its left neighbour", () => {
      const seeded = [
        sample({ id: "a" }),
        sample({ id: "b" }),
        sample({ id: "c" }),
      ];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      // First row swaps with no one — state unchanged.
      act(() => result.current.moveItemUp("a"));
      expect(result.current.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
      // Middle row swaps up with the row above.
      act(() => result.current.moveItemUp("b"));
      expect(result.current.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
      // Last row swaps up with the row above.
      act(() => result.current.moveItemUp("c"));
      expect(result.current.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    });

    it("moveItemDown swaps the row with its right neighbour", () => {
      const seeded = [
        sample({ id: "a" }),
        sample({ id: "b" }),
        sample({ id: "c" }),
      ];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      // Last row swaps with no one — state unchanged.
      act(() => result.current.moveItemDown("c"));
      expect(result.current.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
      // First row swaps down with the row below.
      act(() => result.current.moveItemDown("a"));
      expect(result.current.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
      // Middle row swaps down with the row below.
      act(() => result.current.moveItemDown("a"));
      expect(result.current.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    });
  });

  describe("updateItem", () => {
    it("updates the title field via key dispatch", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() => result.current.updateItem("svc-test", "title", "Updated"));
      expect(result.current.items[0].title).toBe("Updated");
    });

    it("parses numeric strings into basePriceXLM", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() =>
        result.current.updateItem("svc-test", "basePriceXLM", "42.5"),
      );
      expect(result.current.items[0].basePriceXLM).toBeCloseTo(42.5);
    });

    it("treats empty numeric inputs as zero fallback", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() => result.current.updateItem("svc-test", "durationMinutes", ""));
      expect(result.current.items[0].durationMinutes).toBe(0);
    });

    it("treats non-numeric strings as zero fallback", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() => result.current.updateItem("svc-test", "basePriceXLM", "abc"));
      expect(result.current.items[0].basePriceXLM).toBe(0);
    });

    it("parses a leading-decimal string like '.5' to 0.5", () => {
      const { result } = renderHook(() =>
        useServicesStep({
          initialItems: [sample({ basePriceXLM: 0 })],
          createId: makeId,
        }),
      );
      act(() =>
        result.current.updateItem("svc-test", "basePriceXLM", ".5"),
      );
      expect(result.current.items[0].basePriceXLM).toBeCloseTo(0.5);
    });

    it("falls back to 0 for a whitespace-only numeric input", () => {
      const { result } = renderHook(() =>
        useServicesStep({
          initialItems: [sample({ durationMinutes: 30 })],
          createId: makeId,
        }),
      );
      act(() =>
        result.current.updateItem("svc-test", "durationMinutes", "   "),
      );
      expect(result.current.items[0].durationMinutes).toBe(0);
    });

    it("falls back to 0 for the literal string 'NaN'", () => {
      const { result } = renderHook(() =>
        useServicesStep({
          initialItems: [sample({ basePriceXLM: 5 })],
          createId: makeId,
        }),
      );
      act(() =>
        result.current.updateItem("svc-test", "basePriceXLM", "NaN"),
      );
      expect(result.current.items[0].basePriceXLM).toBe(0);
    });
  });

  describe("reset", () => {
    it("replaces items with the next array", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() => result.current.reset([sample({ id: "fresh" })]));
      expect(result.current.items.length).toBe(1);
      expect(result.current.items[0].id).toBe("fresh");
    });

    it("clears items when no argument is passed", () => {
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: [sample()], createId: makeId }),
      );
      act(() => result.current.reset());
      expect(result.current.items).toEqual([]);
    });
  });

  describe("errorsById / isValid", () => {
    it("reports invalid state when any row is invalid", () => {
      const seeded = [
        sample({ id: "a", title: "Valid" }),
        sample({ id: "b", title: "" }),
      ];
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      expect(result.current.isValid).toBe(false);
      expect(result.current.errorsById.a.valid).toBe(true);
      expect(result.current.errorsById.b.valid).toBe(false);
    });

    it("reports valid state when every row passes", () => {
      const { result } = renderHook(() =>
        useServicesStep({
          initialItems: [sample({ title: "Valid" })],
          createId: makeId,
        }),
      );
      expect(result.current.isValid).toBe(true);
    });
  });

  describe("large data set (20+ rows)", () => {
    it("renders without warnings or extra ids for an array of 25 rows", () => {
      const seeded = Array.from({ length: 25 }, (_, i) =>
        sample({ id: `seed-${i}`, title: `Row ${i + 1}` }),
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { result } = renderHook(() =>
        useServicesStep({ initialItems: seeded, createId: makeId }),
      );
      expect(result.current.items.length).toBe(25);
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Each child in a list should have a unique "key" prop/),
      );
      consoleSpy.mockRestore();
    });
  });
});
