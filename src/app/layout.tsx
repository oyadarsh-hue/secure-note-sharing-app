import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "QuietNote · Secure note sharing",
    template: "%s · QuietNote",
  },
  description:
    "Share a note with clear boundaries: access keys, one-time links and expiry.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <ShieldCheck className="text-emerald-800" />
              QuietNote
              <span className="ml-1 rounded bg-stone-100 px-2 py-1 text-[10px] tracking-widest text-stone-500">
                POC
              </span>
            </Link>
            <Link
              href="/notes"
              className="text-sm font-semibold text-emerald-800"
            >
              My notes ↗
            </Link>
          </div>
        </header>
        <main className="mx-auto min-h-[80vh] max-w-5xl px-5 py-10 sm:py-16">
          {children}
        </main>
        <footer className="mx-auto max-w-5xl border-t border-stone-200 px-5 py-6 text-xs text-stone-500">
          QuietNote · Built by Adarsh S for Peacock India. Share thoughtfully.
        </footer>
      </body>
    </html>
  );
}
