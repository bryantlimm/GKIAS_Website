// app/retreatkeluarga2026/signin/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/retreatkeluarga2026/myregistration");
  }, [router]);

  return null;
}