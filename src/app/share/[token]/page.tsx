import { ShareView } from "@/components/share-view";
export const dynamic = "force-dynamic";
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <ShareView token={token} />
    </div>
  );
}
