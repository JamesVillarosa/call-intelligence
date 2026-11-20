"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const watch = (cb: () => void) => { const o = new MutationObserver(cb); o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => o.disconnect(); };

// Light is the default; the choice is saved per browser. Transitions are paused for one frame so the flip is instant.
export function ThemeToggle() {
  const dark = useSyncExternalStore(watch, () => document.documentElement.classList.contains("dark"), () => false);
  const flip = () => {
    const el = document.documentElement, next = !dark;
    el.classList.add("theming");
    el.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("theming")));
  };
  return (
    <button onClick={flip} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className="press relative grid size-10 place-items-center overflow-hidden rounded-full text-fg-2 hover:bg-inset hover:text-fg">
      <Sun className={`keep-motion absolute size-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${dark ? "rotate-90 scale-50 opacity-0" : ""}`} />
      <Moon className={`keep-motion absolute size-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-out)] ${dark ? "" : "-rotate-90 scale-50 opacity-0"}`} />
    </button>
  );
}
