"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Share2,
  ChevronDown,
  History,
  Package,
  Upload,
  PanelLeftOpen,
  PanelLeftClose,
  Save,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function EditorHeader({
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
}: EditorHeaderProps) {
  const router = useRouter();
  const { workflowId, workflowName, setWorkflowName, nodes, edges, viewport, setNodes, setEdges, setViewport } =
    useWorkflowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showRightMenu, setShowRightMenu] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const saveWorkflow = useCallback(async () => {
    if (!workflowId) return;
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          flowState: { nodes, edges, viewport },
        }),
      });
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save");
    }
  }, [workflowId, workflowName, nodes, edges, viewport]);

  const exportWorkflow = useCallback(() => {
    const data = JSON.stringify({ nodes, edges, viewport }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName || "workflow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  }, [nodes, edges, viewport, workflowName]);

  const importWorkflow = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.viewport) setViewport(data.viewport);
        toast.success("Workflow imported");
      } catch {
        toast.error("Invalid workflow JSON");
      }
      if (importRef.current) importRef.current.value = "";
    },
    [setNodes, setEdges, setViewport]
  );

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      {/* Left side: Logo + Sidebar toggle + Name */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
          title="Back to Dashboard"
        >
          <Workflow className="h-5 w-5 text-primary" />
        </button>

        <div className="h-5 w-px bg-border" />

        {/* Left Sidebar Toggle - prominent button */}
        <button
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
            leftSidebarOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title={leftSidebarOpen ? "Close node panel" : "Open node panel"}
        >
          {leftSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Nodes</span>
        </button>

        <div className="h-5 w-px bg-border" />

        {isEditing ? (
          <input
            autoFocus
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              saveWorkflow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditing(false);
                saveWorkflow();
              }
            }}
            className="h-7 w-48 rounded border border-primary bg-input px-2 text-sm focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded px-2 py-0.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            {workflowName}
          </button>
        )}
      </div>

      {/* Right side: Save + History + Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={saveWorkflow}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-accent hover:text-foreground"
          title="Save (Cmd+S)"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </button>

        <input ref={importRef} type="file" accept=".json" onChange={importWorkflow} className="hidden" />

        {/* History toggle */}
        <button
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
            rightSidebarOpen
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:bg-accent hover:text-foreground"
          )}
          title="Toggle execution history"
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">History</span>
        </button>

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setShowRightMenu(!showRightMenu)}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-sm text-muted transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {showRightMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-border bg-popover py-1 shadow-xl">
              <button
                onClick={() => {
                  exportWorkflow();
                  setShowRightMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              >
                <Package className="h-4 w-4" />
                Export JSON
              </button>
              <button
                onClick={() => {
                  importRef.current?.click();
                  setShowRightMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
