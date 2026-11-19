import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonStyles, Card } from "@/components/ui";

export default function InAppNotFound() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8">
      <Card className="px-6 py-16 text-center">
        <div className="flex justify-center"><LogoMark size={36} /></div>
        <h1 className="t-h2 mt-5">This page doesn&rsquo;t exist</h1>
        <p className="t-small mt-2 text-fg-2">Check the link, or use the sidebar to find what you need.</p>
        <Link href="/" className={`${buttonStyles({ variant: "primary" })} mt-6`}>Back to Overview</Link>
      </Card>
    </div>
  );
}
