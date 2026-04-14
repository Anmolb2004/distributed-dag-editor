"use client";

import { useEffect, useRef } from "react";
import { Play, Trash2, Copy, Maximize } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onRun: (nodeId: string) => void;
  onFitView: () => void;
}

export function ContextMenu({
  x,
  y,
  nodeId,
  onClose,
  onDelete,
  onDuplicate,
  onRun,
  onFitView,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const items = [
    {
      icon: Play,
      label: "Run Node",
      onClick: () => { onRun(nodeId); onClose(); },
      color: "text-emerald-400",
    },
    {
      icon: Copy,
      label: "Duplicate",
      onClick: () => { onDuplicate(nodeId); onClose(); },
    },
    { divider: true as const },
    {
      icon: Maximize,
      label: "Fit View",
      onClick: () => { onFitView(); onClose(); },
    },
    { divider: true as const },
    {
      icon: Trash2,
      label: "Delete",
      onClick: () => { onDelete(nodeId); onClose(); },
      color: "text-destructive",
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-100 w-48 rounded-lg border border-border bg-popover py-1 shadow-2xl"
      style={{ top: y, left: x }}
    >
      {items.map((item, i) => {
        if ("divider" in item) {
          return <div key={i} className="my-1 h-px bg-border" />;
        }
        const Icon = item.icon!;
        return (
          <button
            key={item.label}
            onClick={item.onClick}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <Icon className={`h-3.5 w-3.5 ${item.color ?? "text-muted-foreground"}`} />
            <span className={item.color ?? "text-foreground"}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
