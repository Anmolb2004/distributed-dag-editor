"use client";

import { X, CheckCircle2, XCircle, Clock, Loader2, MinusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
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
    <div className="space-y-1 pt-2">
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
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[nodeRun.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const Icon = statusConfig.icon;

  const hasInputs = nodeRun.inputs && Object.keys(nodeRun.inputs).length > 0;
  const hasOutputs = nodeRun.outputs && Object.keys(nodeRun.outputs).length > 0;
  const hasDetails = hasInputs || hasOutputs || nodeRun.error;

  return (
    <div className="border-l-2 border-border ml-2">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={cn(
          "flex w-full items-start gap-2 pl-3 pr-1 py-1.5 text-left",
          hasDetails && "hover:bg-accent/50 rounded-r-md cursor-pointer"
        )}
      >
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
          {/* Inline preview when not expanded */}
          {!expanded && nodeRun.error && (
            <p className="mt-0.5 text-[10px] text-destructive truncate">
              Error: {nodeRun.error}
            </p>
          )}
          {!expanded && nodeRun.status === "success" && hasOutputs && (
            <p className="mt-0.5 text-[10px] text-muted-foreground truncate">
              Output: {getValuePreview(nodeRun.outputs)}
            </p>
          )}
        </div>
        {hasDetails && (
          expanded
            ? <ChevronDown className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 mt-1 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded details: inputs, outputs, error */}
      {expanded && (
        <div className="ml-8 mr-2 mb-1 space-y-1.5">
          {hasInputs && (
            <div>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Inputs</span>
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(filterDisplayInputs(nodeRun.inputs)).map(([key, val]) => (
                  <div key={key} className="flex gap-1.5">
                    <span className="text-[10px] text-muted-foreground shrink-0">{key}:</span>
                    <span className="text-[10px] text-foreground truncate">{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasOutputs && (
            <div>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Outputs</span>
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(nodeRun.outputs).map(([key, val]) => (
                  <div key={key} className="flex gap-1.5">
                    <span className="text-[10px] text-muted-foreground shrink-0">{key}:</span>
                    <span className="text-[10px] text-foreground truncate">{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {nodeRun.error && (
            <div>
              <span className="text-[9px] font-medium uppercase tracking-wider text-destructive">Error</span>
              <p className="mt-0.5 text-[10px] text-destructive">{nodeRun.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Filter out internal/noisy keys from inputs for display */
function filterDisplayInputs(inputs: Record<string, unknown>): Record<string, unknown> {
  const hidden = new Set(["isRunning", "nodeType", "label", "_imageUrls", "result"]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (hidden.has(k)) continue;
    if (v === null || v === undefined || v === "") continue;
    result[k] = v;
  }
  return result;
}

function formatValue(val: unknown): string {
  if (typeof val === "string") {
    if (val.startsWith("data:image")) return "[image data]";
    if (val.startsWith("http")) return val.length > 60 ? val.slice(0, 60) + "..." : val;
    return val.length > 80 ? val.slice(0, 80) + "..." : val;
  }
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (typeof val === "object" && val !== null) return JSON.stringify(val).slice(0, 60);
  return String(val);
}

function getValuePreview(outputs: Record<string, unknown>): string {
  const val = outputs.output ?? outputs.result ?? Object.values(outputs)[0];
  return formatValue(val);
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
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Execution History</span>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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
