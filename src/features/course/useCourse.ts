"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CourseRepository } from "./repository";
import type { CourseState } from "./types";
export function useCourse() {
  const repository = useMemo(
    () => (supabase ? new CourseRepository(supabase) : null),
    [],
  );
  const [state, setState] = useState<CourseState | null>(null),
    [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    if (!repository) {
      setError(true);
      return;
    }
    try {
      const state = await repository.load();
      setState(state);
      setError(false);
    } catch {
      setError(true);
    }
  }, [repository]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { state, error, repository, refresh };
}
