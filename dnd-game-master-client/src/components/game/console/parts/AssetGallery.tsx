"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Assets } from "@/lib/types";

interface AssetGalleryProps {
  assets?: Assets[] | null;
  alt?: string;
  className?: string;
}

const ASSET_PREFIX = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/adventure/ToA/'

/**
 * Live scene art for the current turn. Displays a horizontal stack of thumbnails
 * which can be clicked to enlarge in a full-screen modal overlay.
 */
export function AssetGallery({ assets, alt = "Scene art", className = "" }: AssetGalleryProps) {
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const images = (assets ?? []).filter(Boolean);
  if (images.length === 0) return null;

  return (
    <>
      <div className={`flex flex-row flex-wrap gap-4 ${className}`}>
        {images.map((asset, i) => (
          <div key={i}>
            <img
              src={`${ASSET_PREFIX}${asset.URL}`}
              alt={`${alt} ${i + 1}`}
              className="h-48 w-64 cursor-pointer rounded-card border border-gold/30 object-cover shadow-sm transition-transform hover:scale-105"
              onClick={() => setZoomedUrl(`${ASSET_PREFIX}${asset.URL}`)}
            />
            <span>{asset.description}</span>
          </div>
        ))}
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {zoomedUrl && (
            <motion.div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedUrl(null)}
            >
              <motion.img
                src={zoomedUrl}
                alt={alt}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
