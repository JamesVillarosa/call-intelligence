"use client";
import { useCallback, useSyncExternalStore } from "react";

// localStorage-backed state that is safe during server render and syncs across components.
const subs = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();
export function useLocal<T>(key: string, fallback: T): [T, (v: T) => void] {
  const read = useCallback(() => {
    const raw = localStorage.getItem(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    let value = fallback;
    try { if (raw != null) value = JSON.parse(raw); } catch {}
    cache.set(key, { raw, value });
    return value;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, read, () => fallback);
  const set = useCallback((v: T) => { localStorage.setItem(key, JSON.stringify(v)); subs.forEach((s) => s()); }, [key]);
  return [value, set];
}
