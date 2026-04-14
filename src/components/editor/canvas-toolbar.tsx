"use client";

import { useCallback, useState } from "react";
import {
  Plus,
  MousePointer2,
  Hand,
  Scissors,
  LayoutGrid,
  Link,
  Undo2,
  Redo2,
  Keyboard,
  Maximize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflow-store";

export function CanvasToolbar() {
  const { canUndo, canRedo, undo, redo, nodes } = useWorkflowStore();
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleTidyUp = useCallback(() => {
    const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
    const GAP_X = 300;
    const GAP_Y = 180;
    const COLS = Math.ceil(Math.sqrt(sorted.length));

    sorted.forEach((node, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      useWorkflowStore.getState().setNodes(
        useWorkflowStore.getState().nodes.map((n) =>
          n.id === node.id
            ? { ...n, position: { x: col * GAP_X + 50, y: row * GAP_Y + 50 } }
            : n
        )
      );
    });

    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, fitView]);

  const shortcuts = [
    { key: "N", desc: "Add node" },
    { key: "Del / ⌫", desc: "Delete node" },
    { key: "⌘Z", desc: "Undo" },
    { key: "⇧⌘Z", desc: "Redo" },
    { key: "⌘S", desc: "Save" },
    { key: "Space + Drag", desc: "Pan canvas" },
    { key: "Scroll", desc: "Zoom" },
  ];

  return (
    <div className="flex h-12 items-center justify-between border-t border-border bg-background px-4">
      {/* Left: Undo/Redo + Keyboard shortcuts */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={cn(
            "rounded-lg p-2 transition-colors",
            canUndo()
              ? "text-muted-foreground hover:bg-accent hover:text-foreground"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={cn(
            "rounded-lg p-2 transition-colors",
            canRedo()
              ? "text-muted-foreground hover:bg-accent hover:text-foreground"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="relative">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Keyboard shortcuts
          </button>
          {showShortcuts && (
            <div className="absolute bottom-full left-0 mb-2 w-52 rounded-lg border border-border bg-popover p-3 shadow-xl">
              <p className="mb-2 text-xs font-medium text-foreground">Shortcuts</p>
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-muted-foreground">{s.desc}</span>
                  <kbd className="rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Tool buttons */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1">
        <button
          onClick={handleTidyUp}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Tidy Up"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Fit View"
        >
          <Maximize className="h-4 w-4" />
        </button>
        <div className="mx-0.5 h-5 w-px bg-border" />
        <button
          onClick={() => zoomIn({ duration: 200 })}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => zoomOut({ duration: 200 })}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Node count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{nodes.length} nodes</span>
      </div>
    </div>
  );
}
