"use client";
import { Download, Phone, Upload } from "lucide-react";
import { useState } from "react";
import { Logo, WavePulse } from "@/components/logo";
import { Avatar, AvatarGroup, Badge, BandBadge, Button, Card, CardBody, CardHeader, Checkbox, CountUp, DateRangePicker, DeltaChip, EmptyState, ErrorState, IconButton, Input, Kbd, KpiCard, Menu, MultiSelect, ProgressMeter, Quote, RangeSlider, ScoreBar, ScoreRing, SearchInput, Segmented, Select, Skeleton, Sparkline, StatusDot, StepPill, Switch, Tabs, Tooltip, type DateRange } from "@/components/ui";

const Row = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-line py-6"><h2 className="t-th mb-4 text-fg-3">{title}</h2><div className="flex flex-wrap items-center gap-3">{children}</div></section>
);

export function Showcase() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [ms, setMs] = useState<string[]>([]);
  const [range, setRange] = useState<[number, number]>([20, 80]);
  const [on, setOn] = useState(true);
  const [dr, setDr] = useState<DateRange>({});
  return (
    <div>
      <h1 className="t-h1">Design system</h1>
      <Row title="Logo"><Logo variant="full" /><Logo variant="mark" size={48} /><Logo variant="mark" size={16} /><Logo variant="mono" size={32} /><Logo variant="stacked" size={40} /><WavePulse /></Row>
      <Row title="Type"><div className="space-y-1"><p className="t-display">41%</p><p className="t-h1">Heading one</p><p className="t-h2">Heading two</p><p className="t-h3">Heading three</p><p className="t-body">Body text for paragraphs.</p><p className="t-small text-fg-2">Small text for secondary content.</p><p className="t-caption text-fg-3">Caption 12px</p></div></Row>
      <Row title="Buttons"><Button variant="primary"><Upload />Upload call</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="soft">Soft</Button><Button variant="danger">Delete</Button><Button variant="primary" loading>Saving</Button><Button size="sm">Small</Button><Button size="lg" variant="primary">Large</Button><IconButton label="Download"><Download /></IconButton></Row>
      <Row title="Badges"><Badge tone="brand">Brand</Badge><Badge tone="success" dot>Booked</Badge><Badge tone="warning">Quoted</Badge><Badge tone="danger">Lost</Badge><Badge tone="info">Call back</Badge><Badge tone="gold">Gold</Badge><BandBadge band="close" /><BandBadge band="work" /><BandBadge band="critical" /><StepPill label="Investigate" passed /><StepPill label="Close" passed={false} /><DeltaChip value={6} suffix="%" /><DeltaChip value={-3} /><DeltaChip value={null} /><StatusDot tone="success" /><Kbd>⌘</Kbd><Kbd>K</Kbd></Row>
      <Row title="Avatars"><Avatar name="Devon" /><Avatar name="Priya Shah" size={36} /><Avatar name="Devon" kind="rep" size={36} /><Avatar kind="customer" size={36} /><Avatar kind="unknown" size={36} /><AvatarGroup names={["Devon", "Maya", "Hannah", "Mike", "Marcus"]} /></Row>
      <Row title="Scores"><ScoreRing value={12} max={12} band="gold" size={64} label="12/12" /><ScoreRing value={11} max={12} band="green" size={64} label="11" /><ScoreRing value={10} max={12} band="close" size={48} label="10" /><ScoreRing value={7} max={12} band="work" size={40} /><ScoreRing value={3} max={12} band="critical" size={28} /><div className="w-40 space-y-2"><ScoreBar value={72} band="work" /><ProgressMeter value={2} total={3} band="close" /></div><Sparkline data={[30, 42, 38, 51, 47, 60]} /></Row>
      <Row title="Tabs"><Tabs label="Demo" value={tab} onChange={setTab} items={[{ value: "a", label: "Scorecard" }, { value: "b", label: "Coaching", count: 3 }, { value: "c", label: "Details" }]} /><Segmented label="Demo" value={tab} onChange={setTab} items={[{ value: "a", label: "All", count: 20 }, { value: "b", label: "New sale", count: 8 }, { value: "c", label: "Scheduling" }]} /></Row>
      <Row title="Inputs"><Input placeholder="Customer name" className="max-w-56" /><SearchInput placeholder="Search calls" hint={<Kbd>/</Kbd>} className="w-56" /><Select label="Sort" value="score" onChange={() => {}} options={[{ value: "score", label: "Score" }, { value: "len", label: "Length" }]} /><MultiSelect label="Rep" value={ms} onChange={setMs} options={[{ value: "Devon", label: "Devon", count: 8 }, { value: "Maya", label: "Maya", count: 2 }]} /><DateRangePicker value={dr} onChange={setDr} /><Checkbox checked label="Select" onChange={() => {}} /><Switch checked={on} onChange={setOn} label="Needs attention" /><div className="w-48"><RangeSlider label="Score" value={range} onChange={setRange} /></div></Row>
      <Row title="Overlays"><Tooltip content="Share of sales calls that booked."><Button>Hover me</Button></Tooltip><Menu trigger={<Button>Menu</Button>} items={[{ label: "Open call", icon: <Phone />, onSelect: () => {} }, "separator", { label: "Re-score", onSelect: () => {} }]} /></Row>
      <Row title="Cards"><div className="grid w-full gap-4 sm:grid-cols-2"><KpiCard label="Booking rate" help="Sales calls that ended booked." value={<CountUp value={86} suffix="%" />} denom="6 of 7 sales calls" delta={<DeltaChip value={null} />} spark={<Sparkline data={[60, 70, 66, 86]} />} /><Card><CardHeader title="Card title" sub="Supporting line" /><CardBody><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-4 w-1/2" /></CardBody></Card></div></Row>
      <Row title="Quote"><Quote onPlay={() => {}} time="1:20" className="max-w-md">I&apos;m going to ask a few quick questions so I can get you the right plan.</Quote></Row>
      <Row title="States"><Card className="w-full"><EmptyState title="No calls match" body="Try another search or clear the filters." action={<Button>Clear filters</Button>} /></Card><Card className="w-full"><ErrorState body="We couldn't load calls. Check your connection and try again." action={<Button>Retry</Button>} /></Card></Row>
    </div>
  );
}
