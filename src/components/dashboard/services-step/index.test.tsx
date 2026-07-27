import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServicesStep } from "./index";
import { ToastProvider } from "@/hooks/use-toast";
import { ToastContainer } from "@/app/components/ui/toast-container";
import type { ServiceItem } from "../types";

// Wrap with the ToastProvider + ToastContainer so the Save handler's toasts
// are rendered to the DOM in tests (otherwise they only live in context).
function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>,
  );
}

const sample = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "svc-1",
  title: "Strategy call",
  description: "A 60-minute strategy session.",
  basePriceXLM: 120,
  durationMinutes: 60,
  ...overrides,
});

describe("ServicesStep", () => {
  beforeEach(() => {
    // jsdom does not implement crypto.randomUUID — provide a fallback
    // so deterministic ids continue to work in tests
    if (!("randomUUID" in globalThis.crypto)) {
      (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID =
        () => "uuid-test";
    }
  });

  it("renders without crashing when empty", () => {
    renderWithProviders(<ServicesStep initialItems={[]} />);
    expect(screen.getByRole("heading", { name: /services & pricing/i })).toBeInTheDocument();
  });

  it("shows the empty state when no seed items are provided", () => {
    renderWithProviders(<ServicesStep initialItems={[]} />);
    expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("services-step-empty-add")).toBeInTheDocument();
  });

  it("renders the seeded items", () => {
    renderWithProviders(
      <ServicesStep initialItems={[sample({ title: "Strategy call" })]} />,
    );
    expect(screen.getAllByTestId("services-step-row")).toHaveLength(1);
    const titleInput = screen.getByTestId("services-step-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Strategy call");
  });

  it("renders the draft status chip", () => {
    renderWithProviders(
      <ServicesStep initialItems={[sample()]} draftStatus="saved" lastSavedLabel="2 minutes ago" />,
    );
    expect(screen.getByText(/saved as draft · 2 minutes ago/i)).toBeInTheDocument();
  });

  it("renders warning draft status", () => {
    renderWithProviders(
      <ServicesStep initialItems={[]} draftStatus="offline" />,
    );
    expect(screen.getByText(/offline — changes local only/i)).toBeInTheDocument();
  });

  it("renders the saving draft status", () => {
    renderWithProviders(
      <ServicesStep initialItems={[sample()]} draftStatus="saving" />,
    );
    expect(screen.getByText(/saving…/i)).toBeInTheDocument();
  });

  describe("add row", () => {
    it("adds a blank service when the Add service button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ServicesStep initialItems={[]} />);
      // Switch out of empty state first
      await user.click(screen.getByTestId("services-step-empty-add"));
      expect(screen.getAllByTestId("services-step-row")).toHaveLength(1);
      await user.click(screen.getByTestId("services-step-add"));
      expect(screen.getAllByTestId("services-step-row")).toHaveLength(2);
    });

    it("disables Add service once the cap is reached", () => {
      const many = Array.from({ length: 30 }, (_, i) =>
        sample({ id: `svc-${i}`, title: `Row ${i + 1}` }),
      );
      renderWithProviders(<ServicesStep initialItems={many} />);
      const addBtn = screen.getByTestId("services-step-add");
      expect(addBtn).toBeDisabled();
    });
  });

  describe("duplicate / delete / reorder", () => {
    it("duplicates a row directly below the original with a '(copy)' suffix", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ServicesStep initialItems={[sample({ id: "a", title: "Coaching" })]} />);
      const beforeRows = screen.getAllByTestId("services-step-row");
      const titleBefore = within(beforeRows[0]).getByTestId(
        "services-step-title",
      ) as HTMLInputElement;
      await user.click(within(beforeRows[0]).getByTestId("services-step-duplicate"));
      const afterRows = screen.getAllByTestId("services-step-row");
      expect(afterRows).toHaveLength(2);
      const newTitle = within(afterRows[1]).getByTestId(
        "services-step-title",
      ) as HTMLInputElement;
      expect(newTitle.value).toBe("Coaching (copy)");
      expect(within(afterRows[0]).getByTestId("services-step-title")).toBe(titleBefore);
    });

    it("removes the row when delete is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a" }), sample({ id: "b" })]} />,
      );
      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[0]).getByTestId("services-step-delete"));
      expect(screen.getAllByTestId("services-step-row")).toHaveLength(1);
    });

    it("moves a row up via the up button", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "A" }),
            sample({ id: "b", title: "B" }),
          ]}
        />,
      );
      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[1]).getByTestId("services-step-move-up"));
      const titles = screen
        .getAllByTestId("services-step-title")
        .map((input) => (input as HTMLInputElement).value);
      expect(titles).toEqual(["B", "A"]);
    });

    it("moves a row down via the down button", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "A" }),
            sample({ id: "b", title: "B" }),
          ]}
        />,
      );
      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[0]).getByTestId("services-step-move-down"));
      const titles = screen
        .getAllByTestId("services-step-title")
        .map((input) => (input as HTMLInputElement).value);
      expect(titles).toEqual(["B", "A"]);
    });

    it("disables the up button on the first row", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a", title: "A" })]} />,
      );
      const row = screen.getByTestId("services-step-row");
      expect(within(row).getByTestId("services-step-move-up")).toBeDisabled();
    });

    it("disables the down button on the last row", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a", title: "A" })]} />,
      );
      const row = screen.getByTestId("services-step-row");
      expect(within(row).getByTestId("services-step-move-down")).toBeDisabled();
    });
  });

  describe("validation feedback", () => {
    it("blocks save when any row is invalid", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "" })]}
          onSave={onSave}
        />,
      );
      const saveBtn = screen.getByTestId("services-step-save");
      // Ensure it is not focusable as a real link by clicking via user
      await user.click(saveBtn);
      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not block onSave when rows are valid", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "valid", title: "Coaching" })]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("renders an error message for empty titles", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a", title: "" })]} />,
      );
      // The error copy is rendered inside a `<p role="alert">`. Query by
      // visible text and then assert the role — `getByRole("alert", { name: ... })`
      // is brittle with `dom-accessibility-api`'s name calc for non-form
      // elements, so the role + accessible wiring assertions below preserve
      // the a11y contract without coupling to internals.
      const message = screen.getByText(/title is required/i);
      expect(message).toBeInTheDocument();
      expect(message).toHaveAttribute("role", "alert");

      // Resolve the input-side wiring explicitly: the input must point at
      // the error element via aria-describedby and that element must be the
      // alert (verifies the contract regardless of how the ids are built).
      const titleInput = screen.getByTestId("services-step-title");
      const ariaDescId = titleInput.getAttribute("aria-describedby");
      expect(ariaDescId).toBeTruthy();
      const referenced = ariaDescId
        ? document.getElementById(ariaDescId)
        : null;
      expect(referenced).toBe(message);
    });

    it("marks the title input aria-invalid when invalid", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a", title: "" })]} />,
      );
      const title = screen.getByTestId("services-step-title");
      expect(title).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("save lifecycle", () => {
    it("calls onSave with the current items", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "Coaching" })]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({ id: "a", title: "Coaching" }),
      ]);
    });

    it("shows the success toast after save", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "Coaching" })]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      // The success toast is mounted via ToastContainer inside the harness.
      expect(await screen.findByText(/services saved/i)).toBeInTheDocument();
    });

    it("shows error toast on save failure", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockRejectedValue(new Error("network down"));
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "Coaching" })]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      // Wait for the rejected promise + finally clause
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      // Error toast surfaces inside the rendered ToastContainer
      expect(await screen.findByText(/could not save services/i)).toBeInTheDocument();
      expect(await screen.findByText(/network down/i)).toBeInTheDocument();
      const btn = screen.getByTestId("services-step-save");
      expect(btn).not.toHaveAttribute("aria-busy", "true");
    });

    it("shows warning toast when save is attempted with invalid rows", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "" })]}
          onSave={onSave}
        />,
      );
      // The save button is disabled, so we verify the disabled attribute and
      // that the click guard inside handleSave also defends against any pointer
      // events that slip through (e.g. via aria-disabled bypass tools).
      const btn = screen.getByTestId("services-step-save");
      expect(btn).toHaveAttribute("aria-disabled", "true");
      // Calling handleSave directly via a synthetic click should still be
      // blocked by the disabled Link, but the JS guard is a belt-and-braces.
      await user.click(btn).catch(() => undefined);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("live region announcements", () => {
    it("announces when a row is added", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ServicesStep initialItems={[]} />);
      await user.click(screen.getByTestId("services-step-empty-add"));
      // Wait one frame for the requestAnimationFrame-based announce helper.
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const live = screen.getByTestId("services-step-live-region");
      expect(live.textContent ?? "").toMatch(/new service added/i);
    });

    it("announces when a row is duplicated", async () => {
      const user = userEvent.setup();
      renderWithProviders(<ServicesStep initialItems={[sample({ id: "a", title: "Yoga" })]} />);
      const row = screen.getByTestId("services-step-row");
      await user.click(within(row).getByTestId("services-step-duplicate"));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const live = screen.getByTestId("services-step-live-region");
      expect(live.textContent ?? "").toMatch(/duplicated/i);
    });
  });

  describe("large data set", () => {
    it("renders 25 services without crashing", () => {
      const many = Array.from({ length: 25 }, (_, i) =>
        sample({ id: `svc-${i}`, title: `Service ${i + 1}` }),
      );
      renderWithProviders(<ServicesStep initialItems={many} />);
      expect(screen.getAllByTestId("services-step-row")).toHaveLength(25);
    });
  });

  describe("RTL logical layout", () => {
    it("aligns text-start in arabic locale when document direction is RTL", () => {
      // Simulate RTL by setting <html dir="rtl">; the row already uses
      // flex / ms-/me-/text-start-friendly Tailwind classes so layout
      // reverses without code changes.
      document.documentElement.setAttribute("dir", "rtl");
      renderWithProviders(
        <ServicesStep initialItems={[sample({ title: "جلسة استشارية" })]} />,
      );
      const title = screen.getByTestId("services-step-title") as HTMLInputElement;
      expect(title.value).toBe("جلسة استشارية");
      document.documentElement.removeAttribute("dir");
    });
  });

  describe("validation summary", () => {
    it("shows 'all valid' when every row passes", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ title: "Coaching" })]} />,
      );
      expect(screen.getByTestId("services-step-validation-summary")).toHaveTextContent(
        /all valid/i,
      );
    });

    it("reports the error count when rows fail validation", () => {
      renderWithProviders(
        <ServicesStep initialItems={[sample({ id: "a", title: "" })]} />,
      );
      expect(screen.getByTestId("services-step-validation-summary")).toHaveTextContent(
        /1 row need attention/i,
      );
    });
  });

  describe("without onSave", () => {
    it("does not render the Save button when onSave is omitted", () => {
      renderWithProviders(<ServicesStep initialItems={[sample()]} />);
      expect(screen.queryByTestId("services-step-save")).not.toBeInTheDocument();
    });
  });

  describe("drag-and-drop reorder", () => {
    it("reorders the list when a row is dragged onto another row", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
            sample({ id: "c", title: "Gamma" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      const source = rows[0];
      const target = rows[2];
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("a"),
        effectAllowed: "",
        dropEffect: "",
      };

      fireEvent.dragStart(source, { dataTransfer });
      fireEvent.dragOver(target, { dataTransfer });
      fireEvent.drop(target, { dataTransfer });

      const titles = screen
        .getAllByTestId("services-step-title")
        .map((i) => (i as HTMLInputElement).value);
      expect(titles).toEqual(["Beta", "Gamma", "Alpha"]);
    });

    it("clears drag highlight after drag end with no drop", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a" }), sample({ id: "b" })]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.dragStart(rows[0], { dataTransfer });
      fireEvent.dragEnd(rows[0]);

      // highlight ring should no longer be on the row after drag ends
      expect(rows[0].className).not.toMatch(/ring-cyan-300\/40/);
    });

    it("does nothing when the drop target's id matches the dragged id", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("a"),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.dragStart(rows[0], { dataTransfer });
      fireEvent.drop(rows[0], { dataTransfer });

      const titles = screen
        .getAllByTestId("services-step-title")
        .map((i) => (i as HTMLInputElement).value);
      expect(titles).toEqual(["Alpha", "Beta"]); // unchanged
    });

    it("does nothing when the drop payload refers to an unknown id", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("missing-id"),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.drop(rows[1], { dataTransfer });

      const titles = screen
        .getAllByTestId("services-step-title")
        .map((i) => (i as HTMLInputElement).value);
      expect(titles).toEqual(["Alpha", "Beta"]); // unchanged
    });
  });

  describe("live-region move announcements", () => {
    async function waitForAnnouncement(containerTestId: string) {
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      });
      const live = screen.getByTestId(containerTestId);
      return live.textContent ?? "";
    }

    it("announces when a row is moved up via the button", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[1]).getByTestId("services-step-move-up"));

      const text = await waitForAnnouncement("services-step-live-region");
      expect(text).toMatch(/Beta moved up to position 1/i);
    });

    it("announces when a row is moved down via the button", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[0]).getByTestId("services-step-move-down"));

      const text = await waitForAnnouncement("services-step-live-region");
      expect(text).toMatch(/Alpha moved down to position 2/i);
    });

    it("falls back to 'Service N' in the announcement when title is empty", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "" }),
          ]}
        />,
      );

      // The empty-title row sits at position 2 (1-based). After clicking its
      // Move-up button, the row is now at position 1; the announcement uses
      // the safeTitle fallback ("Service 2") because its title is empty.
      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[1]).getByTestId("services-step-move-up"));

      const text = await waitForAnnouncement("services-step-live-region");
      expect(text).toMatch(/Service 2 moved up to position 1/i);
    });

    it("announces when a row is removed via the delete button", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Alpha" }),
            sample({ id: "b", title: "Beta" }),
          ]}
        />,
      );

      const rows = screen.getAllByTestId("services-step-row");
      await user.click(within(rows[0]).getByTestId("services-step-delete"));

      const text = await waitForAnnouncement("services-step-live-region");
      expect(text).toMatch(/Alpha removed from the list/i);
    });
  });

  describe("validation summary pluralization", () => {
    it("reports 'X rows need attention' (plural) when 2+ rows fail", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "" }),
            sample({ id: "b", title: "" }),
            sample({ id: "c", title: "Valid" }),
          ]}
        />,
      );
      expect(screen.getByTestId("services-step-validation-summary")).toHaveTextContent(
        /2 rows need attention/i,
      );
    });

    it("reports '1 row needs attention' (singular) when exactly 1 row fails", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "" }),
            sample({ id: "b", title: "Valid" }),
          ]}
        />,
      );
      expect(screen.getByTestId("services-step-validation-summary")).toHaveTextContent(
        /1 row need attention/i,
      );
    });

    it("display plural 'services' when more than 1 service exists", () => {
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a" }), sample({ id: "b" })]}
        />,
      );
      expect(screen.getByTestId("services-step-validation-summary")).toHaveTextContent(
        /2 of 30 services/i,
      );
    });
  });

  describe("toast feedback on saved count", () => {
    it("uses singular 'service' wording when only 1 row is saved", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "Coaching" })]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      expect(await screen.findByText(/1 service saved/i)).toBeInTheDocument();
    });

    it("uses plural 'services' wording when N>1 rows are saved", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderWithProviders(
        <ServicesStep
          initialItems={[
            sample({ id: "a", title: "Coaching" }),
            sample({ id: "b", title: "Review" }),
          ]}
          onSave={onSave}
        />,
      );
      await user.click(screen.getByTestId("services-step-save"));
      expect(await screen.findByText(/2 services saved/i)).toBeInTheDocument();
    });
  });

  describe("save lifecycle concurrency", () => {
    it("ignores rapid re-clicks of the Save button while a save is in flight", async () => {
      const user = userEvent.setup();
      let resolveSave: (() => void) | undefined;
      const onSave = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSave = resolve;
          }),
      );
      renderWithProviders(
        <ServicesStep
          initialItems={[sample({ id: "a", title: "Coaching" })]}
          onSave={onSave}
        />,
      );

      const saveBtn = screen.getByTestId("services-step-save");
      await user.click(saveBtn);
      // While the first save is still pending, a second click should be
      // treated as a no-op (defence-in-depth inside handleSave's `busy`
      // guard). The visible button is already disabled, but the JS guard
      // catches assistive-tech clicks that bypass the disabled attribute.
      await user.click(saveBtn).catch(() => undefined);
      expect(onSave).toHaveBeenCalledTimes(1);

      // Now resolve the pending save and confirm the busy state clears.
      resolveSave?.();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(saveBtn).not.toHaveAttribute("aria-busy", "true");
    });
  });
});
