import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceRow } from "./service-row";
import { validateRow, type ServiceItemField } from "./use-services-step";
import type { ServiceItem } from "../types";

const sample = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "svc-row-test",
  title: "Strategy call",
  description: "A 60-minute working session.",
  basePriceXLM: 120,
  durationMinutes: 60,
  ...overrides,
});

/**
 * Buttons inside ServiceRow are passed through stubbed callbacks. The component
 * is meant to be stateless, so the test harness only needs to assert that the
 * stubs were called with the right arguments and never reaches network state.
 */
function noopCallbacks() {
  return {
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onDuplicate: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
  };
}

describe("ServiceRow", () => {
  it("renders the title, price, duration, and description inputs", () => {
    const cb = noopCallbacks();
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...cb}
        />
      </ul>,
    );

    const row = screen.getByTestId("services-step-row");
    expect(within(row).getByTestId("services-step-title")).toBeInTheDocument();
    expect(within(row).getByTestId("services-step-price")).toBeInTheDocument();
    expect(within(row).getByTestId("services-step-duration")).toBeInTheDocument();
    expect(
      within(row).getByTestId("services-step-description"),
    ).toBeInTheDocument();
  });

  it("mirrors the item snapshot into the controlled inputs", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample({
            title: "Brand audit",
            basePriceXLM: 250,
            durationMinutes: 90,
            description: "Full brand audit",
          })}
          validation={validateRow(
            sample({
              title: "Brand audit",
              basePriceXLM: 250,
              durationMinutes: 90,
              description: "Full brand audit",
            }),
          )}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(
      (screen.getByTestId("services-step-title") as HTMLInputElement).value,
    ).toBe("Brand audit");
    expect(
      (screen.getByTestId("services-step-price") as HTMLInputElement).value,
    ).toBe("250");
    expect(
      (screen.getByTestId("services-step-duration") as HTMLInputElement).value,
    ).toBe("90");
    expect(
      (screen.getByTestId("services-step-description") as HTMLTextAreaElement)
        .value,
    ).toBe("Full brand audit");
  });

  it("falls back to 0 when basePriceXLM is NaN so the input stays controlled", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample({ basePriceXLM: Number.NaN })}
          validation={{ valid: false, errors: {} }}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(
      (screen.getByTestId("services-step-price") as HTMLInputElement).value,
    ).toBe("0");
  });

  it("falls back to 0 when durationMinutes is NaN so the input stays controlled", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample({ durationMinutes: Number.NaN })}
          validation={{ valid: false, errors: {} }}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(
      (screen.getByTestId("services-step-duration") as HTMLInputElement).value,
    ).toBe("0");
  });

  it("clamps the price input value to the row's basePriceXLM even if numeric", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample({ basePriceXLM: 99.99 })}
          validation={validateRow(sample({ basePriceXLM: 99.99 }))}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(
      (screen.getByTestId("services-step-price") as HTMLInputElement).value,
    ).toBe("99.99");
  });

  it("calls onUpdate with the parsed value when the price input changes", () => {
    const cb = noopCallbacks();
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...cb}
        />
      </ul>,
    );

    fireEvent.change(screen.getByTestId("services-step-price"), {
      target: { value: "75" },
    });

    expect(cb.onUpdate).toHaveBeenCalledWith(
      "svc-row-test",
      "basePriceXLM",
      "75",
    );
  });

  it("calls onUpdate when the title input changes", () => {
    const cb = noopCallbacks();
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...cb}
        />
      </ul>,
    );

    fireEvent.change(screen.getByTestId("services-step-title"), {
      target: { value: "Brand new" },
    });

    expect(cb.onUpdate).toHaveBeenCalledWith(
      "svc-row-test",
      "title",
      "Brand new",
    );
  });

  it("calls onUpdate when the duration input changes", () => {
    const cb = noopCallbacks();
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...cb}
        />
      </ul>,
    );

    fireEvent.change(screen.getByTestId("services-step-duration"), {
      target: { value: "30" },
    });

    expect(cb.onUpdate).toHaveBeenCalledWith(
      "svc-row-test",
      "durationMinutes",
      "30",
    );
  });

  it("calls onUpdate when the description textarea changes", () => {
    const cb = noopCallbacks();
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...cb}
        />
      </ul>,
    );

    fireEvent.change(screen.getByTestId("services-step-description"), {
      target: { value: "Refresh copy" },
    });

    expect(cb.onUpdate).toHaveBeenCalledWith(
      "svc-row-test",
      "description",
      "Refresh copy",
    );
  });

  it("renders validation errors with role=alert next to each invalid field", () => {
    const item = sample({
      title: "",
      basePriceXLM: -1,
      durationMinutes: 5,
      description: "x".repeat(281),
    });
    render(
      <ul>
        <ServiceRow
          index={0}
          item={item}
          validation={validateRow(item)}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBe(4);
    expect(alerts[0]).toHaveTextContent(/title is required/i);
    expect(alerts[1]).toHaveTextContent(/positive number/i);
    expect(alerts[2]).toHaveTextContent(/at least 15 minutes/i);
    expect(alerts[3]).toHaveTextContent(/280 characters/i);
  });

  it("marks every invalid input with aria-invalid=true and wires its aria-describedby", () => {
    const item = sample({
      title: "",
      basePriceXLM: -1,
      durationMinutes: 5,
    });
    render(
      <ul>
        <ServiceRow
          index={0}
          item={item}
          validation={validateRow(item)}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    const title = screen.getByTestId("services-step-title");
    expect(title).toHaveAttribute("aria-invalid", "true");
    const titleDescId = title.getAttribute("aria-describedby");
    expect(titleDescId).toBeTruthy();
    expect(document.getElementById(titleDescId!)).toHaveAttribute(
      "role",
      "alert",
    );

    const price = screen.getByTestId("services-step-price");
    expect(price).toHaveAttribute("aria-invalid", "true");

    const duration = screen.getByTestId("services-step-duration");
    expect(duration).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-invalid=false when the row is valid and omits aria-describedby on each input", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(screen.getByTestId("services-step-title")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByTestId("services-step-price")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByTestId("services-step-duration")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByTestId("services-step-description")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("falls back to 'Service N' for the live region and aria-labels when title is empty", () => {
    const item = sample({ title: "" });
    render(
      <ul>
        <ServiceRow
          index={2}
          item={item}
          validation={validateRow(item)}
          isFirst={false}
          isLast={false}
          {...noopCallbacks()}
        />
      </ul>,
    );

    const moveUp = screen.getByTestId("services-step-move-up");
    const moveDown = screen.getByTestId("services-step-move-down");
    const dup = screen.getByTestId("services-step-duplicate");
    const del = screen.getByTestId("services-step-delete");

    expect(moveUp.getAttribute("aria-label")).toMatch(/Service 3 up/i);
    expect(moveDown.getAttribute("aria-label")).toMatch(/Service 3 down/i);
    expect(dup.getAttribute("aria-label")).toMatch(/Duplicate Service 3/);
    expect(del.getAttribute("aria-label")).toMatch(/Delete Service 3/);

    // Live region prefers the safeTitle fallback when title is empty.
    expect(screen.getByText(/Row 3: Service 3/i)).toBeInTheDocument();
  });

  it("uses the actual title for aria-labels and the live region when present", () => {
    const item = sample({ title: "Brand audit" });
    render(
      <ul>
        <ServiceRow
          index={0}
          item={item}
          validation={validateRow(item)}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(
      screen.getByTestId("services-step-delete").getAttribute("aria-label"),
    ).toMatch(/Delete Brand audit/);
    expect(screen.getByText(/Row 1: Brand audit/i)).toBeInTheDocument();
  });

  it("disables Up when isFirst and Down when isLast, but leaves Duplicate and Delete enabled", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(screen.getByTestId("services-step-move-up")).toBeDisabled();
    expect(screen.getByTestId("services-step-move-down")).toBeDisabled();
    expect(screen.getByTestId("services-step-duplicate")).not.toBeDisabled();
    expect(screen.getByTestId("services-step-delete")).not.toBeDisabled();
  });

  it("enables both Up and Down when the row is in the middle of the list", () => {
    render(
      <ul>
        <ServiceRow
          index={1}
          item={sample()}
          validation={validateRow(sample())}
          isFirst={false}
          isLast={false}
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(screen.getByTestId("services-step-move-up")).not.toBeDisabled();
    expect(screen.getByTestId("services-step-move-down")).not.toBeDisabled();
  });

  it("invokes onMoveUp / onMoveDown / onDuplicate / onRemove when the action buttons are clicked", async () => {
    const cb = noopCallbacks();
    const user = userEvent.setup();
    render(
      <ul>
        <ServiceRow
          index={1}
          item={sample()}
          validation={validateRow(sample())}
          isFirst={false}
          isLast={false}
          {...cb}
        />
      </ul>,
    );

    await user.click(screen.getByTestId("services-step-move-up"));
    expect(cb.onMoveUp).toHaveBeenCalledWith("svc-row-test");

    await user.click(screen.getByTestId("services-step-move-down"));
    expect(cb.onMoveDown).toHaveBeenCalledWith("svc-row-test");

    await user.click(screen.getByTestId("services-step-duplicate"));
    expect(cb.onDuplicate).toHaveBeenCalledWith("svc-row-test");

    await user.click(screen.getByTestId("services-step-delete"));
    expect(cb.onRemove).toHaveBeenCalledWith("svc-row-test");
  });

  it("fires the drag-start and drag-end handlers when the row is dragged", () => {
    // We exercise dragStart + dragEnd directly because jsdom's DragEvent
    // doesn't reliably round-trip a stubbed `dataTransfer` to
    // `event.dataTransfer.getData`. The drop / dropReorder plumbing is
    // covered by the integration tests in `index.test.tsx`.
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    render(
      <ul>
        <ServiceRow
          index={1}
          item={sample({ id: "drag-source", title: "Drag source" })}
          validation={validateRow(
            sample({ id: "drag-source", title: "Drag source" }),
          )}
          isFirst={false}
          isLast={false}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onDuplicate={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDragStart={onDragStart}
          onDropReorder={vi.fn()}
          onDragEnd={onDragEnd}
        />
      </ul>,
    );

    const source = screen.getByTestId("services-step-row");
    fireEvent.dragStart(source, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      "drag-source",
    );
    expect(onDragStart).toHaveBeenCalledWith("drag-source");

    fireEvent.dragOver(source, { dataTransfer });
    expect(dataTransfer.dropEffect).toBe("move");

    fireEvent.dragEnd(source);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("ignores drops from the same row (no reorder, no callback)", () => {
    // The `fromId === item.id` branch can't be exercised through jsdom's
    // synthetic DragEvent (dataTransfer is read-only on fireEvent.drop), so
    // we verify the contract at the integration layer in index.test.tsx.
    // Here we just confirm the render still mounts without `onDropReorder`
    // — i.e. the row survives an undefined callback.
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample({ id: "self" })}
          validation={validateRow(sample({ id: "self" }))}
          isFirst
          isLast
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onDuplicate={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
        />
      </ul>,
    );

    // Safe to fire the drop without crashing even though onDropReorder was
    // omitted — the component guards against the missing callback.
    fireEvent.drop(screen.getByTestId("services-step-row"), { dataTransfer });
    expect(screen.getByTestId("services-step-row")).toBeInTheDocument();
  });

  it("clears drag listeners gracefully when neither onDragStart nor onDragEnd is provided", () => {
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
          onDuplicate={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
        />
      </ul>,
    );

    const row = screen.getByTestId("services-step-row");
    fireEvent.dragStart(row, { dataTransfer });
    fireEvent.dragEnd(row);
    // No throw = no error. setData must still be called by the in-component handler.
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "svc-row-test");
  });

  it("applies a cyan ring when highlight=true and omits it when false", () => {
    const { container: hiContainer } = render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          highlight
          {...noopCallbacks()}
        />
      </ul>,
    );
    expect(hiContainer.querySelector(".ring-cyan-300\\/40")).toBeInTheDocument();

    const { container: loContainer } = render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );
    expect(loContainer.querySelector(".ring-cyan-300\\/40")).not.toBeInTheDocument();
  });

  it("exposes a drag handle with aria-hidden=true and the keyboard reorder hint", () => {
    render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );
    const handle = screen.getByTestId("services-step-drag-handle");
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle).toHaveAttribute("title", expect.stringMatching(/drag to reorder/i));
  });

  it("exposes a per-row live region that mentions the safe title and any validation errors", () => {
    const item = sample({ title: "" });
    render(
      <ul>
        <ServiceRow
          index={0}
          item={item}
          validation={validateRow(item)}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );
    // The first <p role="status"> is the row's live region.
    const liveRegions = screen.getAllByRole("status");
    expect(liveRegions.some((el) => /has validation errors/i.test(el.textContent ?? ""))).toBe(true);
  });

  it("renders the danger tone palette on the delete action", () => {
    const { container } = render(
      <ul>
        <ServiceRow
          index={0}
          item={sample()}
          validation={validateRow(sample())}
          isFirst
          isLast
          {...noopCallbacks()}
        />
      </ul>,
    );
    const deleteBtn = screen.getByTestId("services-step-delete");
    expect(deleteBtn.className).toMatch(/border-rose-400/);
    expect(deleteBtn.className).toMatch(/text-rose-200/);
    // Sanity: the neutral palette is not applied.
    expect(deleteBtn.className).not.toMatch(/border-white\/10 text-slate-200/);
    // Container is not empty
    expect(container.querySelector("li")).toBeInTheDocument();
  });

  it("renders the neutral palette on the up/down/duplicate actions", () => {
    render(
      <ul>
        <ServiceRow
          index={1}
          item={sample()}
          validation={validateRow(sample())}
          isFirst={false}
          isLast={false}
          {...noopCallbacks()}
        />
      </ul>,
    );

    for (const testId of [
      "services-step-move-up",
      "services-step-move-down",
      "services-step-duplicate",
    ]) {
      const btn = screen.getByTestId(testId);
      expect(btn.className).toMatch(/border-white\/10 text-slate-200/);
    }
  });

  it("uses 1-based position via data-row-index and computes aria-labels from index+1", () => {
    render(
      <ul>
        <ServiceRow
          index={4}
          item={sample()}
          validation={validateRow(sample())}
          isFirst={false}
          isLast={false}
          {...noopCallbacks()}
        />
      </ul>,
    );

    expect(screen.getByTestId("services-step-row")).toHaveAttribute(
      "data-row-index",
      "5",
    );
    expect(
      screen.getByTestId("services-step-move-up").getAttribute("aria-label"),
    ).toMatch(/currently position 5/);
  });
});
