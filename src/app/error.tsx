"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Something went wrong.</h1>
      <p>Please try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
