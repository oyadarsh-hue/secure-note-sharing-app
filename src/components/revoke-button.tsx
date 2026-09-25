"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
export function RevokeButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function revoke() {
    setBusy(true);
    try {
      const res = await fetch(`/api/notes/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {confirm ? (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-red-200 p-4"
        >
          <p>
            Revoke this link permanently? Anyone who already opened the note may
            have saved its content.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" disabled={busy} onClick={revoke}>
              {busy ? "Revoking…" : "Confirm revoke"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="destructive"
          disabled={disabled}
          onClick={() => setConfirm(true)}
        >
          Revoke share link
        </Button>
      )}
    </div>
  );
}
