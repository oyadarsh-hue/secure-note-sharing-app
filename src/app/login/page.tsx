import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";
export default function Login() {
  return (
    <div className="mx-auto max-w-md">
      <p className="eyebrow mb-3">WELCOME BACK</p>
      <h1 className="mb-3 text-3xl font-semibold">
        Your notes, under control.
      </h1>
      <p className="mb-8 text-stone-600">
        Sign in to create and manage your shared notes.
      </p>
      <Card>
        <AuthForm />
      </Card>
    </div>
  );
}
