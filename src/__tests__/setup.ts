import "@testing-library/jest-dom";

/**
 * jsdom does not implement `IntersectionObserver`. The empty-state illustration
 * (`src/app/components/empty-state-illustration.tsx`) instantiates one inside a
 * `useEffect` to pause animations when the element scrolls out of view. Without
 * the mock, every test that renders an `EmptyStateCard` throws
 * `ReferenceError: IntersectionObserver is not defined`.
 *
 * The polyfill below follows the codebase's existing double-cast pattern (see
 * the test file's `(globalThis.crypto as unknown as { randomUUID })` cast) and
 * dispatches a single `isIntersecting: true` entry on `observe`, so any code
 * that defends on `entry.isIntersecting` behaves consistently with the real
 * IntersectionObserver.
 */
if (typeof globalThis.IntersectionObserver === "undefined") {
  class IntersectionObserverPolyfill {
    private callback: IntersectionObserverCallback | null = null;
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe(target: Element): void {
      // Match the real observer's behaviour on first observe: dispatch a
      // synthetic entry marking the element as currently intersecting so
      // components that gate behaviour on `isIntersecting` see `true`.
      this.callback?.(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
            target,
            // Unused fields are zeroed out so the entry satisfies the type.
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          } as unknown as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve(): void {}
    disconnect(): void {
      this.callback = null;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    readonly root: Element | Document | null = null;
    readonly rootMargin = "0px";
    readonly thresholds: ReadonlyArray<number> = [0];
  }
  (
    globalThis as unknown as {
      IntersectionObserver: typeof IntersectionObserver;
    }
  ).IntersectionObserver = IntersectionObserverPolyfill as unknown as typeof IntersectionObserver;
}
