"use client";
import { useEffect, useRef } from "react";

// Counts up once per browser session, in under half a second. The server renders the final value, and
// automated browsers, ?static=1 and reduced-motion users always see the final value with no animation.
export function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver || location.search.includes("static=1") || sessionStorage.getItem("counted")) return;
    const fmt = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-US")}${suffix}`;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      sessionStorage.setItem("counted", "1");
      const t0 = performance.now();
      const tick = (t: number) => { const p = Math.min((t - t0) / 450, 1); node.textContent = fmt(value * (1 - Math.pow(1 - p, 4))); if (p < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    });
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, prefix, suffix]);
  return <span ref={el} className="num">{`${prefix}${value.toLocaleString("en-US")}${suffix}`}</span>;
}
