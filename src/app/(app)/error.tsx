"use client";
import { Button, Card, ErrorState } from "@/components/ui";

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
      <Card><ErrorState body="This page couldn't load. Your data is safe. Try again, and if it keeps happening, check the connection." action={<Button variant="primary" onClick={reset}>Try again</Button>} /></Card>
    </div>
  );
}
