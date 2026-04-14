import { Workflow } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">NextFlow</span>
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-accent" />
        </div>
      </header>

      <div className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="h-8 w-48 animate-pulse rounded bg-accent" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-accent" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
