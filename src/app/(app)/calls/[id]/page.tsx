import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallDetail } from "@/components/call/call-detail";
import { listCalls, tidy } from "@/lib/calls";
import { getCall } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getCall(id);
  return { title: data?.label ?? "Call" };
}

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [data, all] = await Promise.all([getCall(id), listCalls()]);
  if (!data) notFound();
  const i = all.findIndex((c) => c.id === id);
  return <CallDetail call={{ ...data, analysis: tidy(data.analysis) }} prev={all[i - 1]?.id} next={all[i + 1]?.id} index={i + 1} total={all.length} />;
}
