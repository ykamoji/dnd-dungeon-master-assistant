/**
 * Scroll `node` into view *within `container` only* by adjusting the container's
 * own scrollTop — never calling element.scrollIntoView(), which would also scroll
 * ancestor scroll containers (it even scrolls overflow:hidden ones), shifting the
 * whole translated game stack and cutting the console off at the top.
 */
export function scrollIntoContainer(
  container: HTMLElement | null,
  node: HTMLElement | null,
  margin = 8,
): void {
  if (!container || !node) return;
  // getBoundingClientRect is fine inside a transformed ancestor: both rects are
  // measured in the same (transformed) space, so the delta is correct.
  const c = container.getBoundingClientRect();
  const n = node.getBoundingClientRect();
  if (n.top < c.top) {
    container.scrollTop -= c.top - n.top + margin;
  } else if (n.bottom > c.bottom) {
    container.scrollTop += n.bottom - c.bottom + margin;
  }
}

/** Pin a scroll container to its bottom (for an append-only log). */
export function scrollToBottom(container: HTMLElement | null): void {
  if (container) container.scrollTop = container.scrollHeight;
}
