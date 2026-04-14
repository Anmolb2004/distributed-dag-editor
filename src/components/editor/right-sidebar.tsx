"use client";

import { X, CheckCircle2, XCircle, Clock, Loader2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHistoryStore, type WorkflowRunEntry, type NodeRunEntry } from "@/store/history-store";
import { formatTimestamp, formatDuration } from "@/lib/format";

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Failed" },
  running: { icon: Loader2, color: "text-warning", bg: "bg-warning/10", label: "Running" },
  pending: { icon: Clock, color: "text-muted", bg: "bg-accent", label: "Pending" },
  partial: { icon: MinusCircle, color: "text-warning", bg: "bg-warning/10", label: "Partial" },
  skipped: { icon: MinusCircle, color: "text-muted-foreground", bg: "bg-accent", label: "Skipped" },
} as const;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        config.bg,
        config.color
      )}
    >
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {config.label}
    </span>
  );
}

function getScopeLabel(scope: string, targetNodeIds: string[]) {
  if (scope === "full") return "Full Workflow";
  if (scope === "single") return "Single Node";
  return `${targetNodeIds.length} nodes selected`;
}

function RunDetail({ run }: { run: WorkflowRunEntry }) {
  return (
    <div className="space-y-2 py-2">
      {run.nodeRuns.map((nr) => (
        <NodeRunItem key={nr.nodeId} nodeRun={nr} />
      ))}
      {run.nodeRuns.length === 0 && (
        <p className="px-3 text-xs text-muted-foreground">No node executions recorded</p>
      )}
    </div>
  );
}

function NodeRunItem({ nodeRun }: { nodeRun: NodeRunEntry }) {
  const statusConfig = STATUS_CONFIG[nodeRun.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = statusConfig.icon;

  return (
    <div className="flex items-start gap-2 border-l-2 border-border pl-3 ml-2">
      <Icon
        className={cn(
          "mt-0.5 h-3.5 w-3.5 shrink-0",
          statusConfig.color,
          nodeRun.status === "running" && "animate-spin"
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{nodeRun.nodeLabel}</span>
          {nodeRun.durationMs !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {formatDuration(nodeRun.durationMs)}
            </span>
          )}
        </div>
        {nodeRun.error && (
          <p className="mt-0.5 text-[10px] text-destructive truncate">
            Error: {nodeRun.error}
          </p>
        )}
        {nodeRun.status === "success" && nodeRun.outputs && Object.keys(nodeRun.outputs).length > 0 && (
          <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
            Output: {getOutputPreview(nodeRun.outputs)}
          </p>
        )}
      </div>
    </div>
  );
}

function getOutputPreview(outputs: Record<string, unknown>): string {
  const val = outputs.output ?? outputs.result ?? Object.values(outputs)[0];
  if (typeof val === "string") {
    return val.length > 80 ? val.slice(0, 80) + "..." : val;
  }
  return JSON.stringify(val)?.slice(0, 80) ?? "";
}

export function RightSidebar({ isOpen, onClose }: RightSidebarProps) {
  const { runs, selectedRunId, setSelectedRunId } = useHistoryStore();

  return (
    <div
      className={cn(
        "absolute right-0 top-0 z-30 flex h-full flex-col border-l border-border bg-sidebar-bg transition-all duration-200",
        isOpen ? "w-80" : "w-0"
      )}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Execution History</span>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Run list */}
          <div className="flex-1 overflow-y-auto">
            {runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground text-center">
                  No executions yet. Run your workflow to see history here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {runs.map((run) => (
                  <div key={run.id} className="px-4 py-3">
                    <button
                      onClick={() =>
                        setSelectedRunId(selectedRunId === run.id ? null : run.id)
                      }
                      className="flex w-full items-start justify-between text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={run.status} />
                          <span className="text-[10px] text-muted-foreground">
                            {getScopeLabel(run.scope, run.targetNodeIds)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(run.startedAt)}
                        </p>
                      </div>
                      {run.durationMs !== undefined && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDuration(run.durationMs)}
                        </span>
                      )}
                    </button>

                    {/* Expanded detail */}
                    {selectedRunId === run.id && <RunDetail run={run} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
