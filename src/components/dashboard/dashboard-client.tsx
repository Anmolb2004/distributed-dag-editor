"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Plus,
  Search,
  Workflow,
  MoreHorizontal,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/format";

interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { runs: number };
}

export function DashboardClient({
  initialWorkflows,
}: {
  initialWorkflows: WorkflowSummary[];
}) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function createWorkflow() {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      if (!res.ok) throw new Error("Failed to create workflow");
      const { workflow } = await res.json();
      router.push(`/workflow/${workflow.id}`);
    } catch {
      toast.error("Failed to create workflow");
    }
  }

  async function deleteWorkflow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workflow deleted");
    } catch {
      toast.error("Failed to delete workflow");
    }
  }

  async function exportWorkflow(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const { workflow } = await res.json();
      const blob = new Blob([JSON.stringify(workflow.flowState, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflow.name || "workflow"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Workflow exported");
    } catch {
      toast.error("Failed to export workflow");
    }
  }

  async function importWorkflow() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const flowState = JSON.parse(text);
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name.replace(".json", "") }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const { workflow } = await res.json();
        await fetch(`/api/workflows/${workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flowState }),
        });
        router.push(`/workflow/${workflow.id}`);
        toast.success("Workflow imported");
      } catch {
        toast.error("Failed to import workflow");
      }
    };
    input.click();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">NextFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={importWorkflow}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-accent hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Workflow className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Node Editor</h1>
          </div>
          <p className="text-muted max-w-lg">
            Build powerful LLM workflows visually. Connect nodes, chain prompts,
            and process media with AI.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs + Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-foreground">
              Projects
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border border-border bg-input pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* New Workflow Card */}
          <button
            onClick={createWorkflow}
            disabled={isPending}
            className="group flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card transition-all hover:border-primary/50 hover:bg-accent"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent group-hover:bg-primary/20 transition-colors">
              <Plus className="h-5 w-5 text-muted group-hover:text-primary transition-colors" />
            </div>
            <span className="mt-3 text-sm font-medium text-muted group-hover:text-foreground transition-colors">
              New Workflow
            </span>
          </button>

          {/* Workflow Cards */}
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              onClick={() => router.push(`/workflow/${workflow.id}`)}
              className="group relative flex h-48 cursor-pointer flex-col rounded-xl border border-border bg-card transition-all hover:border-muted-foreground/30"
            >
              {/* Thumbnail area */}
              <div className="flex flex-1 items-center justify-center rounded-t-xl bg-accent/30">
                {workflow.thumbnail ? (
                  <img
                    src={workflow.thumbnail}
                    alt={workflow.name}
                    className="h-full w-full rounded-t-xl object-cover"
                  />
                ) : (
                  <Workflow className="h-8 w-8 text-muted-foreground/30" />
                )}
              </div>

              {/* Info */}
              <div className="flex items-center justify-between border-t border-border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{workflow.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(workflow.updatedAt))}
                    </p>
                    {workflow._count.runs > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {workflow._count.runs} runs
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === workflow.id ? null : workflow.id);
                    }}
                    className="rounded-md p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted" />
                  </button>

                  {menuOpenId === workflow.id && (
                    <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-popover py-1 shadow-xl">
                      <button
                        onClick={(e) => exportWorkflow(workflow.id, e)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export JSON
                      </button>
                      <button
                        onClick={(e) => deleteWorkflow(workflow.id, e)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-accent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredWorkflows.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No workflows match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
