import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusTimeline } from "./status-timeline";
import { TimelineItem } from "./timeline-types";

const mockItems: TimelineItem[] = [
  {
    id: "1",
    title: "Step 1",
    status: "completed",
    timestamp: "2026-06-30 09:00 AM",
    actor: "Actor 1",
    details: "Details 1",
  },
  // Exercises the `!!item.actor` branch of `hasDetails` (no details, only actor).
  {
    id: "2",
    title: "Step 2",
    status: "pending",
    timestamp: "2026-06-30 10:00 AM",
    actor: "Actor 2",
    isCurrent: true,
  },
  // Exercises the neither-details-nor-actor branch (renders without the
  // expand toggle at all).
  {
    id: "3",
    title: "Step 3",
    status: "pending",
    timestamp: "2026-06-30 11:00 AM",
  },
];

describe("StatusTimeline", () => {
  it("renders all items", () => {
    render(<StatusTimeline items={mockItems} />);
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

  it("expands details when clicked", () => {
    render(<StatusTimeline items={mockItems} />);
    // Two of the three mockItems expand their details (item 1 has both
    // `details` and `actor`, item 2 has only `actor`); use getAllByText and
    // click the first match so the test stays focused on row 1's payload.
    const showButtons = screen.getAllByText("Show Details");
    fireEvent.click(showButtons[0]);
    expect(screen.getByText("Hide Details")).toBeInTheDocument();
    expect(screen.getByText("Actor: Actor 1")).toBeInTheDocument();
    expect(screen.getByText("Details 1")).toBeInTheDocument();
  });

  it("applies aria-current to active step", () => {
    render(<StatusTimeline items={mockItems} />);
    const activeStep = screen.getByText("Step 2");
    expect(activeStep).toHaveAttribute("aria-current", "step");
  });
});
