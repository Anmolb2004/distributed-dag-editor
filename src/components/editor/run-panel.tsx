"use client";

import { Play, Square, LayoutGrid, AlignVerticalSpaceAround } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunPanelProps {
  onRunFull: () => void;
  onRunSelected: () => void;
  selectedCount: number;
  hasNodes: boolean;
}

export function RunPanel({
  onRunFull,
  onRunSelected,
  selectedCount,
  hasNodes,
}: RunPanelProps) {
  if (!hasNodes) return null;
  const hasSelection = selectedCount > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Always run the full graph from the primary action */}
      <button
        onClick={onRunFull}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30"
        )}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        Run nodes
      </button>

      {hasSelection && (
        <button
          onClick={onRunSelected}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Square className="h-3 w-3" />
          Run selected ({selectedCount})
        </button>
      )}

      {/* Group / Tidy Up buttons (like Krea) */}
      <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <LayoutGrid className="h-3 w-3" />
        Group
      </button>
      <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <AlignVerticalSpaceAround className="h-3 w-3" />
        Tidy Up
      </button>
    </div>
  );
}
