"use client";

import { useEffect, useState } from "react";
import { getClasses } from "@/lib/api";
import type { ClassProfile } from "@/lib/types";

interface UseClassesResult {
  classes: ClassProfile[];
  loading: boolean;
  error: string | null;
}

/** Fetches class DNA profiles from GET /tools/classes. */
export function useClasses(): UseClassesResult {
  const [classes, setClasses] = useState<ClassProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getClasses()
      .then((data) => {
        if (active) {
          setClasses(data);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load classes");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { classes, loading, error };
}
