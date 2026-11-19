import { notFound } from "next/navigation";
import { Showcase } from "./showcase";

export const metadata = { title: "Design system" };

// Internal reference page; never served in production.
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="grid lg:grid-cols-2">
      <div className="p-8"><Showcase /></div>
      <div className="dark bg-bg p-8 text-fg"><Showcase /></div>
    </main>
  );
}
