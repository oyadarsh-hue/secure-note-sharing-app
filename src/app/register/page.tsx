import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";
export default function Register() {
  return (
    <div className="mx-auto max-w-md">
      <p className="eyebrow mb-3">GET STARTED</p>
      <h1 className="mb-3 text-3xl font-semibold">
        Make room for safer sharing.
      </h1>
      <p className="mb-8 text-stone-600">Create your QuietNote account.</p>
      <Card>
        <AuthForm register />
      </Card>
    </div>
  );
}
