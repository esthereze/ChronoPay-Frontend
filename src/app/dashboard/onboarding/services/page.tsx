import { ServicesStep } from "@/components/dashboard/services-step";
import type { ServiceItem } from "@/components/dashboard/types";

// Standalone demo wrapper.
// We intentionally avoid `@/app/components/dashboard-shell` here because it
// has unrelated pre-existing type errors (missing exports for RoleContext,
// routes, ThemeSwitcher, etc.) that would block a clean CI typecheck for the
// new onboarding route. The component itself still integrates with the real
// shell via the existing `app/dashboard/page.tsx` integration path.
function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-white">ChronoPay</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Supplier onboarding demo
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}

// Demo seed — kept lightweight so reviewers can scan the layout quickly.
const seedItems: ServiceItem[] = [
  {
    id: "demo-svc-1",
    title: "Product strategy call",
    description:
      "A 60-minute working session where we pressure-test your roadmap, prioritise the next two weeks, and leave you with a written brief.",
    basePriceXLM: 120,
    durationMinutes: 60,
  },
  {
    id: "demo-svc-2",
    title: "Quarterly business review",
    description:
      "A deeper-dive review of the previous quarter with explicit go-forward actions for the next quarter.",
    basePriceXLM: 240,
    durationMinutes: 90,
  },
];

export default function ServicesOnboardingPage() {
  // Simulate the lifecycle described in docs/save-resume-drafts-ux.md
  const handleSave = async (items: ServiceItem[]) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    // The toast inside ServicesStep surfaces success/failure; this demo
    // doesn't persist anywhere, so we simply log for inspection.
    console.log("Saved services", items.length);
  };

  return (
    <DemoShell>
      <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
            Supplier onboarding
          </p>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Services &amp; pricing
          </h1>
          <p className="text-sm text-slate-300">
            Draft your supplier services before publishing. Each row is
            reorderable via Up / Down buttons or by dragging, supports full
            keyboard navigation, and surfaces inline validation as you type.
          </p>
        </header>

        <ServicesStep
          initialItems={seedItems}
          draftStatus="saved"
          lastSavedLabel="2 minutes ago"
          onSave={handleSave}
        />
      </div>
    </DemoShell>
  );
}
