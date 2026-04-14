"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Play, Loader2 } from "lucide-react";

interface NodeShellProps {
  color: string;
  label: string;
  icon: ReactNode;
  isRunning?: boolean;
  isSelected?: boolean;
  children: ReactNode;
  headerRight?: ReactNode;
  width?: string;
  onRun?: () => void;
}

export function NodeShell({
  color,
  label,
  icon,
  isRunning = false,
  isSelected = false,
  children,
  headerRight,
  width = "w-64",
  onRun,
}: NodeShellProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-shadow",
        width,
        isRunning && "node-running",
        isSelected ? "ring-1 ring-offset-1 ring-offset-background" : ""
      )}
      style={{
        borderColor: isSelected ? color : `${color}60`,
        "--glow-color": color,
        ...(isSelected ? { ringColor: color } : {}),
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span style={{ color }} className="flex items-center">
          {icon}
        </span>
        <span className="text-xs font-medium text-muted" style={{ color: `${color}CC` }}>
          {label}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {headerRight}
          {onRun && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRun();
              }}
              disabled={isRunning}
              className="rounded-md p-1 transition-colors hover:bg-accent disabled:opacity-50"
              title="Run this node"
            >
              {isRunning ? (
                <Loader2 className="h-3 w-3 animate-spin" style={{ color }} />
              ) : (
                <Play className="h-3 w-3 fill-current" style={{ color }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}
