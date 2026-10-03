import { RequireAuth } from "@/components/shared/RequireAuth";
import { Nav } from "@/components/shared/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 w-full max-w-full pb-10">
          <Nav />
          {children}
        </main>
        <footer className="w-full border-t border-line py-4 text-center text-xs text-muted">
          &copy; Pitchground 2026
        </footer>
      </div>
    </RequireAuth>
  );
}
