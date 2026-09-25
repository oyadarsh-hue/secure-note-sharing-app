"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Input, Label, Textarea, fieldStyle } from "./ui/input";
import { Alert, Badge } from "./ui/alert";
import { Card } from "./ui/card";
type Created = { noteId: string; shareUrl: string; accessKey: string | null };
export function NoteForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState("");
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied.`);
    } catch {
      setCopied("Copy unavailable. Select and copy the text manually.");
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expiresAt: new Date(String(data.expiresAt)).toISOString(),
        }),
      });
      const value = await res.json();
      if (!res.ok) throw new Error(value.error);
      setCreated(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save note.");
    } finally {
      setBusy(false);
    }
  }
  if (created)
    return (
      <Card className="space-y-6">
        <Badge>NOTE CREATED</Badge>
        <h2 className="text-2xl font-semibold">Your note is ready to share.</h2>
        <p className="text-stone-600">
          Save these details now. The link and access key cannot be retrieved
          later.
        </p>
        <div>
          <Label htmlFor="share-url">Share URL</Label>
          <Input id="share-url" value={created.shareUrl} readOnly />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => copy(created.shareUrl, "Link")}
          >
            Copy link
          </Button>
        </div>
        {created.accessKey && (
          <div>
            <Label htmlFor="access-key">Access key</Label>
            <Input id="access-key" value={created.accessKey} readOnly />
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => copy(created.accessKey!, "Key")}
            >
              Copy access key
            </Button>
            <p className="hint">
              Save this access key. For security, it will not be displayed
              again.
            </p>
          </div>
        )}
        <p role="status" className="text-sm">
          {copied}
        </p>
        <Button asChild>
          <Link href={`/notes/${created.noteId}`}>Manage note →</Link>
        </Button>
      </Card>
    );
  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Give your note a clear title"
            required
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="content">Note content</Label>
          <Textarea
            id="content"
            name="content"
            placeholder="Write what you want to share…"
            required
            maxLength={20000}
          />
          <p className="hint">Plain text only. Up to 20,000 characters.</p>
        </div>
      </Card>
      <Card className="space-y-6">
        <h2 className="text-xl font-semibold">Set the boundaries</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="shareType">Access duration</Label>
            <select id="shareType" name="shareType" className={fieldStyle}>
              <option value="ONE_TIME">One-time access</option>
              <option value="TIME_BASED">Until expiry</option>
            </select>
          </div>
          <div>
            <Label htmlFor="accessType">Who can open it?</Label>
            <select id="accessType" name="accessType" className={fieldStyle}>
              <option value="PASSWORD_PROTECTED">With an access key</option>
              <option value="PUBLIC">Anyone with the link</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="expiresAt">Expires at (your local time)</Label>
          <Input
            id="expiresAt"
            name="expiresAt"
            type="datetime-local"
            required
          />
          <p className="hint">
            Every link has an expiry, including one-time links.
          </p>
        </div>
        <Alert>
          Access keys are generated securely. Send the key separately from the
          link.
        </Alert>
      </Card>
      {error && <Alert>{error}</Alert>}
      <Button disabled={busy}>
        {busy ? "Creating your note…" : "Create secure link →"}
      </Button>
    </form>
  );
}
