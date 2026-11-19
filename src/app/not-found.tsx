import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonStyles } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <div className="flex justify-center"><LogoMark size={40} /></div>
        <h1 className="t-h2 mt-6">This page doesn&rsquo;t exist</h1>
        <p className="t-small mt-2 text-fg-2">Check the link, or head back to the Overview.</p>
        <Link href="/" className={`${buttonStyles({ variant: "primary" })} mt-6`}>Back to Overview</Link>
      </div>
    </main>
  );
}
