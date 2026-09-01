import { RequireAuth } from "@/components/shared/RequireAuth";
import { Nav } from "@/components/shared/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <main className="min-h-screen w-full max-w-full overflow-x-hidden pb-28">
        <Nav />
        {children}
      </main>
    </RequireAuth>
  );
}
