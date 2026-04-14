"use client";

import { create } from "zustand";

export interface NodeRunEntry {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  error?: string;
  durationMs?: number;
}

export interface WorkflowRunEntry {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "success" | "failed" | "partial";
  scope: "full" | "partial" | "single";
  targetNodeIds: string[];
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  nodeRuns: NodeRunEntry[];
}

interface HistoryState {
  runs: WorkflowRunEntry[];
  selectedRunId: string | null;
  isLoading: boolean;

  setRuns: (runs: WorkflowRunEntry[]) => void;
  addRun: (run: WorkflowRunEntry) => void;
  updateRun: (id: string, updates: Partial<WorkflowRunEntry>) => void;
  updateNodeRun: (runId: string, nodeId: string, updates: Partial<NodeRunEntry>) => void;
  setSelectedRunId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  runs: [],
  selectedRunId: null,
  isLoading: false,

  setRuns: (runs) => set({ runs }),

  addRun: (run) => set({ runs: [run, ...get().runs] }),

  updateRun: (id, updates) =>
    set({
      runs: get().runs.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }),

  updateNodeRun: (runId, nodeId, updates) =>
    set({
      runs: get().runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              nodeRuns: r.nodeRuns.map((nr) =>
                nr.nodeId === nodeId ? { ...nr, ...updates } : nr
              ),
            }
          : r
      ),
    }),

  setSelectedRunId: (id) => set({ selectedRunId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
