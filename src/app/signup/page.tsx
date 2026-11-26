import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

async function SignupContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={next} />;
}

export default function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense fallback={<AuthForm mode="signup" />}>
      <SignupContent searchParams={searchParams} />
    </Suspense>
  );
}
