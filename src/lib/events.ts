// Tiny app-wide event bus so any button can open the upload dialog, the rep drawer or the shortcut help.
type Events = { upload: undefined; rep: string; help: undefined; palette: undefined };
export function emit<K extends keyof Events>(name: K, detail?: Events[K]) {
  window.dispatchEvent(new CustomEvent(`ci:${name}`, { detail }));
}
export function on<K extends keyof Events>(name: K, fn: (detail: Events[K]) => void) {
  const h = (e: Event) => fn((e as CustomEvent).detail);
  window.addEventListener(`ci:${name}`, h);
  return () => window.removeEventListener(`ci:${name}`, h);
}
// Recently opened calls, newest first, for the command palette.
export const recent = {
  get: (): string[] => { try { return JSON.parse(localStorage.getItem("recent-calls") ?? "[]"); } catch { return []; } },
  add: (id: string) => localStorage.setItem("recent-calls", JSON.stringify([id, ...recent.get().filter((x) => x !== id)].slice(0, 5))),
};
