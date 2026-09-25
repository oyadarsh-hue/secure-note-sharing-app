import Link from "next/link";
import { ArrowUpRight, KeyRound, Timer, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default function Home() {
  return (
    <div className="space-y-14">
      <div className="grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <p className="eyebrow">A little less permanent.</p>
          <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            The right words.
            <br />
            <span className="text-emerald-800">The right access.</span>
          </h1>
          <p className="max-w-lg text-lg leading-8 text-stone-600">
            Share a note without leaving an open door. Decide who can read it,
            how long it lasts, and when to close access.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/notes/new">
                Create a note <ArrowUpRight size={17} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
        <Card className="rotate-1 space-y-7 border-emerald-200 bg-[#edf4ee]">
          <div className="flex justify-between">
            <span className="eyebrow">A NOTE WITH BOUNDARIES</span>
            <KeyRound size={20} />
          </div>
          <h2 className="text-2xl font-semibold">
            Some things are
            <br />
            just for one reading.
          </h2>
          <div className="space-y-3">
            <div className="h-2 w-full rounded bg-emerald-900/10" />
            <div className="h-2 w-4/5 rounded bg-emerald-900/10" />
            <div className="h-2 w-3/5 rounded bg-emerald-900/10" />
          </div>
          <div className="border-t border-emerald-900/10 pt-5 text-sm text-emerald-900">
            One-time access · Protected by an access key
          </div>
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: KeyRound,
            title: "A key of its own",
            text: "Generate a unique access key. Share it separately for another layer of protection.",
          },
          {
            icon: MousePointerClick,
            title: "One successful view",
            text: "One-time links close after the first successful opening, even with simultaneous requests.",
          },
          {
            icon: Timer,
            title: "You set the limit",
            text: "Choose an expiry, check successful views, or revoke a link when plans change.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <item.icon className="mb-5 text-emerald-800" size={23} />
            <h2 className="mb-2 font-semibold">{item.title}</h2>
            <p className="text-sm leading-6 text-stone-600">{item.text}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm leading-6 text-stone-500">
        This assessment demo is not end-to-end encrypted. Use sample content;
        anyone who reads a note can save a copy.
      </p>
    </div>
  );
}
