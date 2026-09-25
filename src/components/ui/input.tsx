import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export const fieldStyle =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50";
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldStyle, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(fieldStyle, "min-h-40 resize-y", className)}
      {...props}
    />
  );
}
export function Label(props: ComponentProps<"label">) {
  return <label className="mb-2 block text-sm font-semibold" {...props} />;
}
