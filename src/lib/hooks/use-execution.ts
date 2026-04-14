"use client";

import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore, type WorkflowRunEntry, type NodeRunEntry } from "@/store/history-store";
import { toast } from "sonner";

export function useExecution() {
  const { workflowId, nodes, edges, viewport, updateNodeData } = useWorkflowStore();
  const { addRun, updateRun, updateNodeRun, setSelectedRunId } = useHistoryStore();
  const isRunningRef = useRef(false);

  const saveWorkflow = useCallback(async () => {
    if (!workflowId) return;
    await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowState: { nodes, edges, viewport } }),
    });
  }, [workflowId, nodes, edges, viewport]);

  const execute = useCallback(
    async (scope: "FULL" | "PARTIAL" | "SINGLE", targetNodeIds: string[] = []) => {
      if (!workflowId || isRunningRef.current) return;
      isRunningRef.current = true;

      // Auto-save before executing
      await saveWorkflow();

      // Set all target nodes to running state
      const runningIds =
        scope === "FULL" ? nodes.map((n) => n.id) : targetNodeIds;
      for (const id of runningIds) {
        updateNodeData(id, { isRunning: true });
      }

      // Create optimistic run entry
      const tempId = `temp-${Date.now()}`;
      const runEntry: WorkflowRunEntry = {
        id: tempId,
        workflowId,
        status: "running",
        scope: scope.toLowerCase() as "full" | "partial" | "single",
        targetNodeIds,
        startedAt: new Date().toISOString(),
        nodeRuns: runningIds.map((id) => {
          const node = nodes.find((n) => n.id === id);
          return {
            nodeId: id,
            nodeType: (node?.data?.nodeType as string) ?? "unknown",
            nodeLabel: (node?.data?.label as string) ?? "Unknown",
            status: "running" as const,
            inputs: {},
            outputs: {},
          };
        }),
      };
      addRun(runEntry);
      setSelectedRunId(tempId);

      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            scope,
            targetNodeIds,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: "Execution failed" } }));
          throw new Error(err.error?.message ?? "Execution failed");
        }

        const data = await res.json();
        const serverRun = data.run;
        const nodeOutputs = data.nodeOutputs as Record<string, Record<string, unknown>>;

        // Update node data with outputs and remove running state
        for (const [nodeId, outputs] of Object.entries(nodeOutputs)) {
          const node = nodes.find((n) => n.id === nodeId);
          const nodeType = (node?.data?.nodeType as string) ?? node?.type;

          if (nodeType === "llm") {
            updateNodeData(nodeId, { result: outputs.output, isRunning: false });
          } else if (nodeType === "cropImage" || nodeType === "extractFrame") {
            updateNodeData(nodeId, { result: outputs.output, isRunning: false });
          } else {
            updateNodeData(nodeId, { isRunning: false });
          }
        }

        // Clear running state for nodes that didn't produce output
        for (const id of runningIds) {
          if (!nodeOutputs[id]) {
            updateNodeData(id, { isRunning: false });
          }
        }

        // Update run entry with real data
        const mappedRun: WorkflowRunEntry = {
          id: serverRun.id,
          workflowId,
          status: serverRun.status.toLowerCase(),
          scope: serverRun.scope.toLowerCase() as "full" | "partial" | "single",
          targetNodeIds: serverRun.targetNodeIds,
          startedAt: serverRun.startedAt,
          finishedAt: serverRun.finishedAt,
          durationMs: serverRun.durationMs,
          nodeRuns: serverRun.nodeRuns.map((nr: Record<string, unknown>) => ({
            nodeId: nr.nodeId as string,
            nodeType: nr.nodeType as string,
            nodeLabel: (nr.nodeLabel as string) ?? (nr.nodeType as string),
            status: (nr.status as string).toLowerCase(),
            inputs: (nr.inputs ?? {}) as Record<string, unknown>,
            outputs: (nr.outputs ?? {}) as Record<string, unknown>,
            error: nr.error as string | undefined,
            durationMs: nr.durationMs as number | undefined,
          })),
        };

        updateRun(tempId, mappedRun);
        setSelectedRunId(serverRun.id);

        const statusMsg = serverRun.status === "SUCCESS" ? "completed" : "finished with errors";
        toast.success(`Workflow ${statusMsg} in ${(serverRun.durationMs / 1000).toFixed(1)}s`);
      } catch (err) {
        // Clear running state
        for (const id of runningIds) {
          updateNodeData(id, { isRunning: false });
        }
        updateRun(tempId, { status: "failed" });
        toast.error(err instanceof Error ? err.message : "Execution failed");
      } finally {
        isRunningRef.current = false;
      }
    },
    [workflowId, nodes, edges, viewport, saveWorkflow, updateNodeData, addRun, updateRun, updateNodeRun, setSelectedRunId]
  );

  const runFull = useCallback(() => execute("FULL"), [execute]);

  const runSelected = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 1) {
        execute("SINGLE", nodeIds);
      } else if (nodeIds.length > 1) {
        execute("PARTIAL", nodeIds);
      }
    },
    [execute]
  );

  const runSingle = useCallback(
    (nodeId: string) => execute("SINGLE", [nodeId]),
    [execute]
  );

  return { runFull, runSelected, runSingle, saveWorkflow };
}
