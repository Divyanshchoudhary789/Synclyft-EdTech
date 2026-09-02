"use client";

// Per-topic completion for a study plan is tracked client-side (the backend has
// no per-topic state). Keyed by plan id; value is the list of completed topic
// indices. Wrapped so a private window / disabled storage degrades gracefully.

const KEY = (planId: string) => `synclyft:studyplan:${planId}`;

export function readPlanProgress(planId: string): number[] {
  try {
    const raw = localStorage.getItem(KEY(planId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function togglePlanTopic(planId: string, topicIndex: number): number[] {
  const cur = new Set(readPlanProgress(planId));
  if (cur.has(topicIndex)) cur.delete(topicIndex);
  else cur.add(topicIndex);
  const next = [...cur].sort((a, b) => a - b);
  try {
    localStorage.setItem(KEY(planId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
