import { RepsView } from "@/components/reps-view";
import { listCalls } from "@/lib/calls";

export const metadata = { title: "Reps" };
export const dynamic = "force-dynamic";

export default async function Reps() {
  const calls = await listCalls();
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
      <h1 className="t-h1">Reps</h1>
      <p className="t-body mt-1 text-fg-2">How each rep scores, where they slip, and what to practice in your next 1-on-1.</p>
      <RepsView calls={calls} />
    </div>
  );
}
