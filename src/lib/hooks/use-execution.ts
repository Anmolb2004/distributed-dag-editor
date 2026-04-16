"use client";

import { useCallback, useRef } from "react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore, type WorkflowRunEntry, type NodeRunEntry } from "@/store/history-store";
import { toast } from "sonner";

export function useExecution() {
  const { workflowId, nodes, edges, viewport, updateNodeData } = useWorkflowStore();
  const { addRun, updateRun, updateNodeRun, setSelectedRunId } = useHistoryStore();
  const isRunningRef = useRef(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const saveWorkflow = useCallback(async () => {
    if (!workflowId) return;
    await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowState: { nodes, edges, viewport } }),
    });
  }, [workflowId, nodes, edges, viewport]);

  /**
   * Poll the DB for per-node status updates while execution runs.
   * This gives accurate per-node glow: only the actually executing nodes glow.
   */
  const startPolling = useCallback(
    (runId: string, tempRunId: string, runningIds: string[]) => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/workflows/${workflowId}/runs`);
          if (!res.ok) return;
          const data = await res.json();
          const serverRun = data.runs?.find(
            (r: { id: string }) => r.id === runId
          );
          if (!serverRun) return;

          // Update node glow states based on actual DB status
          for (const nr of serverRun.nodeRuns as Array<{
            nodeId: string;
            status: string;
          }>) {
            const isNodeRunning = nr.status === "RUNNING";
            const isNodeDone = ["SUCCESS", "FAILED", "SKIPPED"].includes(nr.status);

            if (isNodeRunning) {
              updateNodeData(nr.nodeId, { isRunning: true });
            } else if (isNodeDone) {
              updateNodeData(nr.nodeId, { isRunning: false });
            }
          }
        } catch {
          // Polling failure is non-fatal
        }
      };

      pollingRef.current = setInterval(poll, 1500);
    },
    [workflowId, updateNodeData]
  );

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const execute = useCallback(
    async (scope: "FULL" | "PARTIAL" | "SINGLE", targetNodeIds: string[] = []) => {
      if (!workflowId || isRunningRef.current) return;
      isRunningRef.current = true;

      await saveWorkflow();

      const runningIds =
        scope === "FULL" ? nodes.map((n) => n.id) : targetNodeIds;

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
            status: "pending" as const,
            inputs: {},
            outputs: {},
          };
        }),
      };
      addRun(runEntry);
      setSelectedRunId(tempId);

      try {
        // Fire off the execution request
        const resPromise = fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            scope,
            targetNodeIds,
          }),
        });

        // Wait a moment for the run to be created in DB, then start polling
        await new Promise((r) => setTimeout(r, 500));

        // Try to get the run ID from a quick peek at the runs
        let serverRunId: string | null = null;
        try {
          const peekRes = await fetch(`/api/workflows/${workflowId}/runs`);
          if (peekRes.ok) {
            const peekData = await peekRes.json();
            const latestRun = peekData.runs?.[0];
            if (latestRun && latestRun.status === "RUNNING") {
              serverRunId = latestRun.id as string;
              startPolling(serverRunId, tempId, runningIds);
            }
          }
        } catch {
          // Non-fatal
        }

        const res = await resPromise;

        stopPolling();

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: "Execution failed" } }));
          throw new Error(err.error?.message ?? "Execution failed");
        }

        const data = await res.json();
        const serverRun = data.run;
        const nodeOutputs = data.nodeOutputs as Record<string, Record<string, unknown>>;

        // Update node data with outputs and clear running state
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

        // Clear running state for nodes without output (failed/skipped)
        for (const id of runningIds) {
          if (!nodeOutputs[id]) {
            updateNodeData(id, { isRunning: false });
          }
        }

        // Update the run entry with real server data
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
        stopPolling();
        for (const id of runningIds) {
          updateNodeData(id, { isRunning: false });
        }
        updateRun(tempId, { status: "failed" });
        toast.error(err instanceof Error ? err.message : "Execution failed");
      } finally {
        isRunningRef.current = false;
      }
    },
    [workflowId, nodes, edges, viewport, saveWorkflow, updateNodeData, addRun, updateRun, updateNodeRun, setSelectedRunId, startPolling, stopPolling]
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
