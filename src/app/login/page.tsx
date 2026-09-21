import { redirect } from "next/navigation";
import { adminMode } from "@/lib/auth";
import { adminSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  /* Already signed in (or running open in dev) — nothing to ask for. */
  const { authed } = await adminSession();
  if (authed) redirect(target);

  const mode = adminMode();

  return (
    <section className="wrap narrow" style={{ padding: "96px 24px" }}>
      <p className="eyebrow">4i Records</p>
      <h1 className="display" style={{ fontSize: 48, margin: "12px 0 28px" }}>
        Back office
      </h1>
      {mode.kind === "misconfigured" ? (
        <p className="error">
          No ADMIN_PASSWORD is set on this deployment, so the dashboard is
          switched off. Set it and redeploy.
        </p>
      ) : (
        <LoginForm next={target} />
      )}
    </section>
  );
}
