import * as React from "react";
import type { VListHandle } from "virtua";

const SETTLE_DEADLINE_MS = 250;

export function useVirtualizedBottomSettle(
  hostRef: React.RefObject<HTMLDivElement | null>,
  listRef: React.RefObject<VListHandle | null>,
  itemsLengthRef: React.RefObject<number>,
) {
  const frameRef = React.useRef<number | null>(null);
  const cancel = React.useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  React.useLayoutEffect(() => {
    const scroller = hostRef.current?.firstElementChild;
    if (!(scroller instanceof HTMLDivElement)) return;
    const retire = () => cancel();
    scroller.addEventListener("pointerdown", retire, { passive: true });
    scroller.addEventListener("touchstart", retire, { passive: true });
    scroller.addEventListener("wheel", retire, { passive: true });
    window.addEventListener("keydown", retire, true);
    return () => {
      scroller.removeEventListener("pointerdown", retire);
      scroller.removeEventListener("touchstart", retire);
      scroller.removeEventListener("wheel", retire);
      window.removeEventListener("keydown", retire, true);
    };
  }, [cancel, hostRef]);

  const settle = React.useCallback(() => {
    cancel();
    const deadline = performance.now() + SETTLE_DEADLINE_MS;
    const next = () => {
      const scroller = hostRef.current?.firstElementChild;
      const lastIndex = itemsLengthRef.current - 1;
      if (!(scroller instanceof HTMLDivElement) || lastIndex < 0) {
        cancel();
        return;
      }
      listRef.current?.scrollToIndex(lastIndex, { align: "end" });
      // Keep chasing until the deadline rather than retiring after two stable
      // frames. Fonts, media, and embeds can change row geometry after an
      // apparently stable pair of frames; real reader input cancels through
      // the listeners above.
      if (performance.now() >= deadline) {
        frameRef.current = null;
        return;
      }
      frameRef.current = requestAnimationFrame(next);
    };
    next();
  }, [cancel, hostRef, itemsLengthRef, listRef]);

  React.useEffect(() => cancel, [cancel]);
  return { cancel, settle };
}
