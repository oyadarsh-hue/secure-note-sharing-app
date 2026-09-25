"use client";
import { useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { Badge, Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Input, Label } from "./ui/input";
import { LocalTime } from "./local-time";
type Info = {
  status: string;
  accessType: string;
  shareType: string;
  expiresAt: string;
};
export function ShareView({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState<{ title: string; content: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/share/${token}/status`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInfo(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [token]);
  async function access(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(`/api/share/${token}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: form.get("key") || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNote(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. A one-time link may already have been used; check before retrying.",
      );
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  if (note)
    return (
      <Card className="space-y-6">
        <Badge>NOTE OPENED</Badge>
        <h1 className="text-3xl font-semibold">{note.title}</h1>
        <div className="whitespace-pre-wrap break-words leading-7">
          {note.content}
        </div>
        <hr className="border-stone-200" />
        <p className="hint">
          {info?.shareType === "ONE_TIME"
            ? "This one-time link is now used. Keep this page open to read the note."
            : "This note remains accessible until expiry or revocation."}
        </p>
      </Card>
    );
  return (
    <Card className="space-y-6">
      <Badge>PRIVATE DELIVERY</Badge>
      <h1 className="text-3xl font-semibold">A note, shared with you.</h1>
      {error && <Alert>{error}</Alert>}
      {!info && !error && <p role="status">Checking this link…</p>}
      {info && info.status !== "ACTIVE" && (
        <Alert>
          This link is {info.status.toLowerCase()}. Ask the sender for a new
          link.
        </Alert>
      )}
      {info?.status === "ACTIVE" && (
        <form onSubmit={access} className="space-y-5">
          <p className="text-stone-600">
            {info.shareType === "ONE_TIME"
              ? "You can open this note once. Opening it will use the link."
              : "Open this note any time before it expires."}
          </p>
          {info.accessType === "PASSWORD_PROTECTED" && (
            <div>
              <Label htmlFor="key">Access key</Label>
              <Input
                id="key"
                name="key"
                type="password"
                autoComplete="off"
                required
                maxLength={72}
                placeholder="Enter the key from the sender"
              />
            </div>
          )}
          <Button disabled={busy}>
            {busy
              ? "Opening…"
              : info.accessType === "PASSWORD_PROTECTED"
                ? "Unlock note"
                : "Open note"}
          </Button>
          <p className="hint">
            Expires <LocalTime value={info.expiresAt} />
          </p>
        </form>
      )}
    </Card>
  );
}
