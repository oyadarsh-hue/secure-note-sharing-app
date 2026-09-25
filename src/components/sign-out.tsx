"use client";
import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
export function SignOut() {
  return (
    <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </Button>
  );
}
