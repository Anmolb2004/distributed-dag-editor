"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Type, Copy } from "lucide-react";
import { NodeShell } from "./node-shell";
import { useWorkflowStore } from "@/store/workflow-store";

function TextNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      color="#EAB308"
      label="Prompt"
      icon={<Type className="h-3.5 w-3.5" />}
      isSelected={selected}
      headerRight={
        <span className="text-[10px] text-muted-foreground">Text</span>
      }
    >
      <div className="relative">
        <textarea
          value={(data.text as string) ?? ""}
          onChange={onChange}
          placeholder="Enter text..."
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-input p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
        />
        <button
          onClick={() => navigator.clipboard.writeText((data.text as string) ?? "")}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Copy text"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>

      {/* Output handle only - assignment specifies: "textarea + output handle" */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="-right-[5px]! top-1/2! h-2.5! w-2.5! border-2! border-yellow-500! bg-card!"
      />
    </NodeShell>
  );
}

export const TextNode = memo(TextNodeComponent);
