import { Skeleton } from "@/components/ui";

// Shown while a page's data loads: the page's shape, not a spinner.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8" aria-busy aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-5 w-80" />
      <Skeleton className="mt-8 h-44 w-full rounded-xl" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-lg" />)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-12"><Skeleton className="h-96 rounded-lg lg:col-span-8" /><Skeleton className="h-96 rounded-lg lg:col-span-4" /></div>
    </div>
  );
}
