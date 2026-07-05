"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { DM_AREA_MAPS, toaAssetUrl, type DmMap } from "@/lib/dmMaps";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Full map image with a zoom slider and drag-to-pan (enabled once zoomed in).
 * Used only inside the DM map popout modal.
 */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const setZoom = (value: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    setScale(next);
    if (next <= 1) setOffset({ x: 0, y: 0 }); // recenter when fully zoomed out
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return; // panning only makes sense when zoomed in
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: start.current.ox + (e.clientX - start.current.x),
      y: start.current.oy + (e.clientY - start.current.y),
    });
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
    setDragging(false);
  };

  const cursor = scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default";

  return (
    <div className="flex flex-col gap-3">
      <div
        className={`relative h-[72vh] w-full overflow-hidden rounded-card bg-obsidian ${cursor}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center",
            transition: dragging ? "none" : "transform 0.08s ease-out",
          }}
        />
      </div>

      {/* Zoom bar */}
      <div className="flex items-center gap-3">
        <span className="font-rune text-[10px] uppercase tracking-[0.2em] text-parchment-dim">
          Zoom
        </span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={scale}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 cursor-pointer accent-gold"
          aria-label="Zoom map"
        />
        <span className="w-10 text-right font-display text-sm text-gold">
          {scale.toFixed(1)}×
        </span>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="rounded-card border border-gold/30 px-2 py-1 font-rune text-xs uppercase tracking-wide text-parchment-dim transition-colors hover:border-gold hover:text-gold"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/**
 * DM-only tool: a custom dropdown of the adventure's Area Maps (DM). Picking a
 * map by its description pops the full image out in a modal.
 */
export function DmMapPicker() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DmMap | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (map: DmMap) => {
    setSelected(map);
    setOpen(false);
    setModalOpen(true);
  };

  return (
    <div>
      <p className="mb-2 font-display text-[10px] uppercase tracking-[0.3em] text-gold">
        DM Area Maps
      </p>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-card border border-gold/30 bg-obsidian-2 px-3 py-2 text-left text-sm text-parchment transition-colors hover:border-gold"
        >
          <span className="truncate">
            {selected ? selected.label : "Select a map to view…"}
          </span>
          <span
            className={`shrink-0 text-gold transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>

        {open && (
          <ul
            role="listbox"
            className="scroll-thin absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-card border border-gold/30 bg-obsidian py-1 shadow-2xl shadow-black/60"
          >
            {DM_AREA_MAPS.map((map) => (
              <li key={map.file} role="option" aria-selected={selected?.file === map.file}>
                <button
                  type="button"
                  onClick={() => pick(map)}
                  className={`block w-full cursor-pointer px-3 py-1.5 text-left text-sm transition-colors hover:bg-gold/10 hover:text-gold-bright ${
                    selected?.file === map.file ? "text-gold" : "text-parchment-dim"
                  }`}
                >
                  {map.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selected?.label ?? "DM Map"}
        size="extra"
      >
        {selected && (
          <ZoomableImage
            key={selected.file}
            src={toaAssetUrl(selected.file)}
            alt={selected.label}
          />
        )}
      </Modal>
    </div>
  );
}
