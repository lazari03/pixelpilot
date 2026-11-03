"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { demoCurriculum, SupabaseLearningRepository } from "@/data/repository";
import type { LearningEvent, Level } from "@/domain/models";
const DEMO_KEY = "creator-progress";
function readDemo(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (v) =>
            typeof v === "string" &&
            /^[0-4]-(Explorer|Builder|Inventor)$/.test(v),
        )
      : [];
  } catch {
    return [];
  }
}
export function useLearning() {
  const repository = useMemo(
    () => (supabase ? new SupabaseLearningRepository(supabase) : null),
    [],
  );
  const [curriculum, setCurriculum] = useState(demoCurriculum);
  const [curriculumStatus, setCurriculumStatus] = useState(
    repository ? "Loading classroom knowledge…" : "Offline demo curriculum",
  );
  const [user, setUser] = useState<User | null>(null);
  const [complete, setComplete] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState(
    "Demo progress stays on this device.",
  );
  const identity = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    if (repository)
      repository
        .loadCurriculum()
        .then((data) => {
          if (active) {
            setCurriculum(data);
            setCurriculumStatus("Classroom knowledge connected");
          }
        })
        .catch(() => {
          if (active)
            setCurriculumStatus(
              "Database curriculum unavailable · showing offline demo",
            );
        });
    async function load(next: User | null) {
      const current = ++revision;
      identity.current = next?.id ?? null;
      setUser(next);
      setComplete([]);
      if (!next) {
        setComplete(readDemo());
        setSaveStatus("Demo progress stays on this device.");
        return;
      }
      try {
        const progress = await repository!.loadProgress(next.id);
        if (active && current === revision) {
          setComplete(progress);
          setSaveStatus("Classroom progress connected.");
        }
      } catch {
        if (active && current === revision)
          setSaveStatus(
            "Cloud progress unavailable. Ask your teacher to check setup.",
          );
      }
    }
    setComplete(readDemo());
    if (!supabase)
      return () => {
        active = false;
      };
    // Subscribe before the initial lookup. Ignore an old lookup after an auth event.
    const initialRevision = revision;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) void load(session?.user ?? null);
      });
    });
    supabase.auth.getUser().then(({ data }) => {
      if (active && revision === initialRevision) void load(data.user);
    });
    return () => {
      active = false;
      revision++;
      data.subscription.unsubscribe();
    };
  }, [repository]);
  const finish = useCallback(
    async (day: number, level: Level) => {
      const owner = user?.id ?? null;
      try {
        if (owner && repository)
          await repository.completeMission(owner, day, level);
        if (identity.current !== owner) return;
        setComplete((previous) => {
          const next = Array.from(new Set([...previous, `${day}-${level}`]));
          if (!owner) {
            try {
              localStorage.setItem(DEMO_KEY, JSON.stringify(next));
            } catch {}
          }
          return next;
        });
        setSaveStatus(
          owner
            ? "Progress saved to your classroom account."
            : "Demo progress saved on this device.",
        );
      } catch {
        setSaveStatus("Could not save. Complete the mission again to retry.");
      }
    },
    [repository, user],
  );
  const record = useCallback(
    async (event: LearningEvent) => {
      if (!user || !repository) return;
      try {
        await repository.recordEvent(user.id, event);
      } catch {
        setSaveStatus(
          "Practice worked locally, but its learning record could not be saved.",
        );
      }
    },
    [repository, user],
  );
  return {
    curriculum,
    curriculumStatus,
    user,
    complete,
    saveStatus,
    finish,
    record,
  };
}
