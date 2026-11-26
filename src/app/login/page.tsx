import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

async function LoginContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={next} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<AuthForm mode="login" />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
