"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return <Sonner position="bottom-center" toastOptions={{ classNames: { toast: "!rounded-xl !border-line !bg-elevated !text-fg !shadow-lg !font-sans", description: "!text-fg-2", actionButton: "!bg-brand-600 !text-white" } }} />;
}
