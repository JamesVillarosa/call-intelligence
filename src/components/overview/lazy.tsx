"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui";

// Charts are code-split so the Overview's text and numbers paint first.
export const ScoreTrend = dynamic(() => import("./charts").then((m) => m.ScoreTrend), { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> });
export const CallMix = dynamic(() => import("./charts").then((m) => m.CallMix), { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> });
