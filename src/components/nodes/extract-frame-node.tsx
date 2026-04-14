"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { Film } from "lucide-react";
import { NodeShell } from "./node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import { useNodeExecution } from "@/lib/hooks/execution-context";

function ExtractFrameNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useEdges();
  const execution = useNodeExecution();

  const isRunning = data.isRunning as boolean;
  const result = data.result as string | null;

  const hasVideoConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "video_url"
  );
  const hasTimestampConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "timestamp"
  );

  return (
    <NodeShell
      color="#EC4899"
      label="Extract Frame"
      icon={<Film className="h-3.5 w-3.5" />}
      isSelected={selected}
      isRunning={isRunning}
      width="w-64"
      onRun={() => execution?.runSingle(id)}
    >
      {/* Video URL input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="video_url"
        className="!-left-[5px] !top-14 !h-2.5 !w-2.5 !border-2 !border-pink-500 !bg-card"
        title="Video URL (required)"
      />

      {/* Timestamp input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="timestamp"
        className="!-left-[5px] !top-32 !h-2.5 !w-2.5 !border-2 !border-pink-500 !bg-card"
        title="Timestamp"
      />

      {/* Result preview */}
      {result && (
        <div className="mb-3">
          <img
            src={result}
            alt="Extracted frame"
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: 150 }}
          />
        </div>
      )}

      {/* Video input status */}
      <div className="mb-3 rounded-md border border-border bg-input px-2.5 py-2">
        <span className="text-[10px] text-muted-foreground">
          {hasVideoConnection ? (
            <span className="text-pink-400">Video connected</span>
          ) : (
            "Awaiting video input..."
          )}
        </span>
      </div>

      {/* Timestamp input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-16">Timestamp</span>
        <input
          type="text"
          value={(data.timestamp as string) ?? "0"}
          onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
          disabled={hasTimestampConnection}
          placeholder='e.g. "5" or "50%"'
          className="h-6 flex-1 rounded border border-border bg-input px-2 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        />
        {hasTimestampConnection && (
          <span className="rounded bg-pink-500/20 px-1 text-[9px] text-pink-400">
            linked
          </span>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!-right-[5px] !top-1/2 !h-2.5 !w-2.5 !border-2 !border-pink-500 !bg-card"
      />
    </NodeShell>
  );
}

export const ExtractFrameNode = memo(ExtractFrameNodeComponent);
