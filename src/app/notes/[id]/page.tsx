import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getOwnedNote } from "@/server/shares";
import { AppError } from "@/server/errors";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/alert";
import { LocalTime } from "@/components/local-time";
import { RevokeButton } from "@/components/revoke-button";
export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const note = await getOwnedNote(user, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="eyebrow">NOTE MANAGEMENT</p>
      <div className="flex items-center justify-between gap-4">
        <h1 className="break-words text-3xl font-semibold">{note.title}</h1>
        <Badge>{note.status}</Badge>
      </div>
      <Card>
        <div className="whitespace-pre-wrap break-words leading-7">
          {note.content}
        </div>
      </Card>
      <Card>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow">Successful views</p>
            <p className="mt-2 text-4xl font-semibold" data-testid="view-count">
              {note.share.viewCount}
            </p>
          </div>
          <div>
            <p className="eyebrow">Access rules</p>
            <p className="mt-2">
              {note.share.shareType === "ONE_TIME" ? "One-time" : "Time-based"}{" "}
              ·{" "}
              {note.share.accessType === "PUBLIC"
                ? "Public"
                : "Password protected"}
            </p>
          </div>
          <div>
            <p className="eyebrow">Created</p>
            <p className="mt-2">
              <LocalTime value={note.createdAt.toISOString()} />
            </p>
          </div>
          <div>
            <p className="eyebrow">Expires</p>
            <p className="mt-2">
              <LocalTime value={note.share.expiresAt.toISOString()} />
            </p>
          </div>
        </div>
        <hr className="my-6 border-stone-200" />
        <RevokeButton id={id} disabled={note.status === "REVOKED"} />
        <p className="hint">
          Revoking blocks future access. It cannot remove copies already saved
          by a reader. Refresh this page to see the latest count.
        </p>
      </Card>
    </div>
  );
}
