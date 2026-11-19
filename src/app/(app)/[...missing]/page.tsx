import { notFound } from "next/navigation";

// Unknown in-app routes render the not-found page inside the app shell.
export default function Missing() {
  notFound();
}
