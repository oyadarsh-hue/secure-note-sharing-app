import Link from "next/link";
export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Page not found.</h1>
      <p>This page is unavailable or you do not have access.</p>
      <Link href="/notes" className="underline">
        Back to my notes
      </Link>
    </div>
  );
}
