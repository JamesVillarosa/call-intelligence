"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "../ui";

type Point = { i: number; id: string; label: string; rep: string | null; pct: number };
const axis = { fontSize: 12, fill: "var(--fg-3)" };

function TipBox({ title, lines }: { title: string; lines: string[] }) {
  return <div className="rounded-md border border-line bg-elevated px-3 py-2 shadow-lg"><p className="t-label">{title}</p>{lines.map((l) => <p key={l} className="t-caption num text-fg-2">{l}</p>)}</div>;
}

// Score per call in the order analyzed. Calls have no call date, so the x-axis says "call", not a date.
export function ScoreTrend({ points, reps }: { points: Point[]; reps: string[] }) {
  const router = useRouter();
  const [rep, setRep] = useState("Team");
  const data = (rep === "Team" ? points : points.filter((p) => p.rep === rep)).map((p, k) => ({ ...p, n: k + 1 }));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented size="sm" label="Show" value={rep} onChange={setRep} items={["Team", ...reps].map((r) => ({ value: r, label: r }))} />
      </div>
      <div className="h-60" role="img" aria-label={`Score per call for ${rep}, ${data.length} calls`}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 12, right: 56, bottom: 20, left: -16 }} onClick={(e) => { const id = (e as { activePayload?: { payload: Point }[] })?.activePayload?.[0]?.payload.id; if (id) router.push(`/calls/${id}`); }}>
            <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.45} /><stop offset="1" stopColor="var(--chart-2)" stopOpacity={0} /></linearGradient><linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--chart-3)" /><stop offset=".5" stopColor="var(--chart-1)" /><stop offset="1" stopColor="var(--chart-2)" /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
            <XAxis dataKey="n" tick={axis} tickLine={false} axisLine={false} label={{ value: "Calls, in order analyzed", position: "insideBottom", offset: -14, style: { ...axis } }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axis} tickLine={false} axisLine={false} unit="%" />
            <ReferenceLine y={92} stroke="var(--band-green)" strokeDasharray="4 4" label={{ value: "Green", position: "right", fill: "var(--success-fg)", fontSize: 12 }} />
            <ReferenceLine y={100} stroke="var(--band-gold)" strokeDasharray="4 4" label={{ value: "Gold", position: "right", fill: "var(--gold-fg)", fontSize: 12 }} />
            <Tooltip cursor={{ stroke: "var(--border-strong)" }} content={({ active, payload }) => active && payload?.[0] ? <TipBox title={`${(payload[0].payload as Point).label}`} lines={[`${(payload[0].payload as Point).pct}%`, (payload[0].payload as Point).rep ?? "Unknown rep", "Click to open"]} /> : null} />
            <Area type="monotone" dataKey="pct" stroke="url(#trendLine)" strokeWidth={3} fill="url(#trendFill)" dot={{ r: 3.5, fill: "var(--card)", stroke: "var(--chart-1)", strokeWidth: 2 }} activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 3, cursor: "pointer" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only"><caption>Score per call</caption><tbody>{data.map((d) => <tr key={d.id}><td>{d.label}</td><td>{d.pct}%</td></tr>)}</tbody></table>
    </div>
  );
}

// Call types are categories, not meanings: one brand-led categorical set.
const MIX = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
export function CallMix({ mix, labels }: { mix: [string, number][]; labels: Record<string, string> }) {
  const router = useRouter();
  const total = mix.reduce((n, [, c]) => n + c, 0);
  const data = mix.map(([k, v]) => ({ k, v, name: labels[k] ?? k }));
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative size-40 shrink-0" role="img" aria-label={`Call mix: ${data.map((d) => `${d.name} ${d.v}`).join(", ")}`}>
          <PieChart width={160} height={160}>
            <Pie data={data} dataKey="v" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={2} cornerRadius={4} stroke="none" animationDuration={800} onClick={(d) => router.push(`/calls?type=${(d as unknown as { k: string }).k}`)} className="cursor-pointer">
              {data.map((d, i) => <Cell key={d.k} fill={MIX[i % MIX.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.[0] ? <TipBox title={String(payload[0].name)} lines={[`${payload[0].value} calls, ${Math.round((Number(payload[0].value) / total) * 100)}%`]} /> : null} />
          </PieChart>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-center"><span><span className="t-h2 num block">{total}</span><span className="t-caption text-fg-3">calls</span></span></span>
      </div>
      <ul className="w-full flex-1">
        {data.map((d, i) => (
          <li key={d.k}><button onClick={() => router.push(`/calls?type=${d.k}`)} className="t-small flex h-9 w-full items-center gap-2.5 rounded-full px-3 hover:bg-inset">
            <span className="size-2.5 rounded-full" style={{ background: MIX[i % MIX.length] }} /><span className="flex-1 text-left">{d.name}</span>
            <span className="num font-medium">{d.v}</span><span className="num w-10 text-right text-fg-3">{Math.round((d.v / total) * 100)}%</span>
          </button></li>
        ))}
      </ul>
    </div>
  );
}
