"use client";

import { useState } from "react";
import {
  Type,
  ImagePlus,
  Video,
  Brain,
  Crop,
  Film,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_TYPES, type NodeType } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflow-store";

const NODE_ITEMS: {
  type: NodeType;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { type: NODE_TYPES.TEXT, label: "Text", icon: Type, color: "#EAB308" },
  { type: NODE_TYPES.UPLOAD_IMAGE, label: "Upload Image", icon: ImagePlus, color: "#3B82F6" },
  { type: NODE_TYPES.UPLOAD_VIDEO, label: "Upload Video", icon: Video, color: "#8B5CF6" },
  { type: NODE_TYPES.LLM, label: "Run Any LLM", icon: Brain, color: "#10B981" },
  { type: NODE_TYPES.CROP_IMAGE, label: "Crop Image", icon: Crop, color: "#F97316" },
  { type: NODE_TYPES.EXTRACT_FRAME, label: "Extract Frame", icon: Film, color: "#EC4899" },
];

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeftSidebar({ isOpen, onClose }: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const addNode = useWorkflowStore((s) => s.addNode);

  const filtered = NODE_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function onDragStart(event: React.DragEvent, nodeType: NodeType) {
    event.dataTransfer.setData("application/nextflow-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  function onClickAdd(nodeType: NodeType) {
    const x = 400 + Math.random() * 200;
    const y = 200 + Math.random() * 200;
    addNode(nodeType, { x, y });
  }

  // Collapsed state: show icon rail
  if (!isOpen) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-border bg-sidebar-bg py-3 gap-1">
        <button
          onClick={onClose}
          className="mb-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Open node panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {NODE_ITEMS.map((item) => (
          <button
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            onClick={() => onClickAdd(item.type)}
            className="rounded-lg p-2 transition-colors hover:bg-accent"
            title={item.label}
          >
            <item.icon className="h-4 w-4" style={{ color: item.color }} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar-bg">
      {/* Header with search */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quick Access
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Collapse panel"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="h-8 w-full rounded-lg border border-border bg-input pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.map((item) => (
          <button
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            onClick={() => onClickAdd(item.type)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="text-left">
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No nodes match &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2">
        <p className="text-[10px] text-muted-foreground">
          Click to add, or drag onto canvas
        </p>
      </div>
    </div>
  );
}
