import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth";
import { SignOut } from "@/components/sign-out";
export const dynamic = "force-dynamic";
export default async function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <>
      <div className="mb-8 flex items-center justify-between text-sm">
        <span className="text-stone-500">Signed in as {session.user.name}</span>
        <SignOut />
      </div>
      {children}
    </>
  );
}
