"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { Crop } from "lucide-react";
import { NodeShell } from "./node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import { useNodeExecution } from "@/lib/hooks/execution-context";

interface CropParam {
  id: string;
  handleId: string;
  label: string;
  dataKey: string;
  defaultValue: number;
  min: number;
  max: number;
}

const CROP_PARAMS: CropParam[] = [
  { id: "x", handleId: "x_percent", label: "X %", dataKey: "xPercent", defaultValue: 0, min: 0, max: 100 },
  { id: "y", handleId: "y_percent", label: "Y %", dataKey: "yPercent", defaultValue: 0, min: 0, max: 100 },
  { id: "w", handleId: "width_percent", label: "Width %", dataKey: "widthPercent", defaultValue: 100, min: 0, max: 100 },
  { id: "h", handleId: "height_percent", label: "Height %", dataKey: "heightPercent", defaultValue: 100, min: 0, max: 100 },
];

function CropImageNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useEdges();
  const execution = useNodeExecution();

  const isRunning = data.isRunning as boolean;
  const result = data.result as string | null;

  const hasImageConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "image_url"
  );

  function isParamConnected(handleId: string) {
    return edges.some((e) => e.target === id && e.targetHandle === handleId);
  }

  return (
    <NodeShell
      color="#F97316"
      label="Crop Image"
      icon={<Crop className="h-3.5 w-3.5" />}
      isSelected={selected}
      isRunning={isRunning}
      width="w-64"
      onRun={() => execution?.runSingle(id)}
    >
      {/* Image URL input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="image_url"
        className="!-left-[5px] !top-14 !h-2.5 !w-2.5 !border-2 !border-orange-500 !bg-card"
        title="Image URL (required)"
      />

      {/* Result preview */}
      {result && (
        <div className="mb-3">
          <img
            src={result}
            alt="Cropped result"
            className="w-full rounded-lg object-cover"
            style={{ maxHeight: 150 }}
          />
        </div>
      )}

      {/* Image input status */}
      <div className="mb-3 rounded-md border border-border bg-input px-2.5 py-2">
        <span className="text-[10px] text-muted-foreground">
          {hasImageConnection ? (
            <span className="text-orange-400">Image connected</span>
          ) : (
            "Awaiting image input..."
          )}
        </span>
      </div>

      {/* Crop parameters */}
      <div className="space-y-2">
        {CROP_PARAMS.map((param, index) => {
          const connected = isParamConnected(param.handleId);
          return (
            <div key={param.id}>
              <Handle
                type="target"
                position={Position.Left}
                id={param.handleId}
                className="!-left-[5px] !h-2.5 !w-2.5 !border-2 !border-orange-500 !bg-card"
                style={{ top: `${100 + index * 36}px` }}
                title={param.label}
              />
              <div className="flex items-center gap-2">
                <span className="w-14 text-[10px] text-muted-foreground">{param.label}</span>
                <input
                  type="number"
                  min={param.min}
                  max={param.max}
                  value={(data[param.dataKey] as number) ?? param.defaultValue}
                  onChange={(e) =>
                    updateNodeData(id, { [param.dataKey]: Number(e.target.value) })
                  }
                  disabled={connected}
                  className="h-6 flex-1 rounded border border-border bg-input px-2 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
                {connected && (
                  <span className="rounded bg-orange-500/20 px-1 text-[9px] text-orange-400">
                    linked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!-right-[5px] !top-1/2 !h-2.5 !w-2.5 !border-2 !border-orange-500 !bg-card"
      />
    </NodeShell>
  );
}

export const CropImageNode = memo(CropImageNodeComponent);
