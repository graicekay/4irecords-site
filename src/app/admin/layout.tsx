import { requireAdmin } from "@/lib/session";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <section className="wrap" style={{ padding: "56px 24px 0" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", gap: 20, flexWrap: "wrap",
      }}>
        <div>
          <p className="eyebrow">Back office</p>
          <h1 className="display" style={{ fontSize: 46, margin: "10px 0 0" }}>
            Inbox
          </h1>
        </div>
        <form action={signOut}>
          <button className="btn" type="submit" style={{ padding: "10px 18px" }}>
            Sign out
          </button>
        </form>
      </div>
      {children}
    </section>
  );
}
