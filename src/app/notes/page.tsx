import Link from "next/link";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocalTime } from "@/components/local-time";
export default async function Notes() {
  const userId = await requireUser();
  const notes = await db.note.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, createdAt: true },
  });
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">YOUR WORKSPACE</p>
          <h1 className="text-4xl font-semibold">My notes</h1>
        </div>
        <Button asChild>
          <Link href="/notes/new">Create a note →</Link>
        </Button>
      </div>
      {notes.length ? (
        <Card className="divide-y divide-stone-200">
          {notes.map((note) => (
            <Link
              className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0 hover:text-emerald-800"
              href={`/notes/${note.id}`}
              key={note.id}
            >
              <span className="font-semibold">{note.title}</span>
              <span className="text-xs text-stone-500">
                <LocalTime value={note.createdAt.toISOString()} /> →
              </span>
            </Link>
          ))}
        </Card>
      ) : (
        <Card>
          <h2 className="mb-2 text-xl font-semibold">A clean slate.</h2>
          <p className="text-stone-600">
            Create your first note and choose how it can be opened.
          </p>
        </Card>
      )}
      <p className="hint">Showing your 50 most recent notes.</p>
    </div>
  );
}
