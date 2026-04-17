"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps, useEdges } from "@xyflow/react";
import { Brain, ChevronDown } from "lucide-react";
import { NodeShell } from "./node-shell";
import { useWorkflowStore } from "@/store/workflow-store";
import { useNodeExecution } from "@/lib/hooks/execution-context";

type ModelOption = { id: string; label: string };
type ModelGroup = { label: string; models: ModelOption[] };

const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "Google Gemini",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
  },
  {
    label: "Groq",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
      { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B (Vision)" },
      { id: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    ],
  },
];

function LlmNodeComponent({ id, data, selected }: NodeProps) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useEdges();
  const execution = useNodeExecution();

  const hasSystemPromptConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "system_prompt"
  );
  const hasUserMessageConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "user_message"
  );
  const hasImagesConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "images"
  );

  const isRunning = data.isRunning as boolean;
  const result = data.result as string | null;

  const onModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      color="#10B981"
      label={(data.model as string) ?? "Gemini"}
      icon={<Brain className="h-3.5 w-3.5" />}
      isSelected={selected}
      isRunning={isRunning}
      width="w-72"
      onRun={() => execution?.runSingle(id)}
      headerRight={
        <span className="text-[10px] text-muted-foreground">LLM</span>
      }
    >
      {/* Input handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="system_prompt"
        className="!-left-[5px] !top-20 !h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-card"
        title="System Prompt"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="user_message"
        className="!-left-[5px] !top-32 !h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-card"
        title="User Message"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="images"
        className="!-left-[5px] !top-44 !h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-card"
        title="Images"
      />

      {/* Result display area (shows inline like Krea) */}
      {result && (
        <div className="mb-3 max-h-48 overflow-y-auto rounded-lg bg-accent p-2.5">
          <p className="text-xs text-foreground whitespace-pre-wrap">{result}</p>
        </div>
      )}

      {/* Model selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Model</span>
          <div className="relative flex-1">
            <select
              value={(data.model as string) ?? "gemini-2.5-flash"}
              onChange={onModelChange}
              className="h-7 w-full appearance-none rounded-md border border-border bg-input px-2 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              {MODEL_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* System prompt */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-muted-foreground">System Prompt</span>
            {hasSystemPromptConnection && (
              <span className="rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-400">connected</span>
            )}
          </div>
          <textarea
            value={(data.systemPrompt as string) ?? ""}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            disabled={hasSystemPromptConnection}
            placeholder="Optional system instructions..."
            rows={2}
            className="w-full resize-none rounded-md border border-border bg-input p-2 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>

        {/* User message */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] text-muted-foreground">User Message</span>
            {hasUserMessageConnection && (
              <span className="rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-400">connected</span>
            )}
          </div>
          <textarea
            value={(data.userMessage as string) ?? ""}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            disabled={hasUserMessageConnection}
            placeholder="Enter your prompt..."
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-input p-2 text-xs text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>

        {/* Images indicator */}
        {hasImagesConnection && (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1.5">
            <span className="text-[10px] text-emerald-400">Images connected</span>
          </div>
        )}
      </div>

      {/* Settings expandable */}
      <button className="mt-2 flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
        <ChevronDown className="h-3 w-3" />
        Settings
      </button>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!-right-[5px] !top-1/2 !h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-card"
      />
    </NodeShell>
  );
}

export const LlmNode = memo(LlmNodeComponent);
