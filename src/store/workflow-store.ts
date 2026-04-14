"use client";

import { create } from "zustand";
import {
  type Edge,
  type Node,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import { NODE_DEFINITIONS, CONNECTION_RULES, type NodeType, type HandleDataType } from "@/types/workflow";

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowState {
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeIds: string[];

  // Undo/redo
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  isValidConnection: (connection: Connection) => boolean;
  loadWorkflow: (id: string, name: string, nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
  clearWorkflow: () => void;

  // Undo/redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

function getOutputDataType(nodeType: string, handleId: string): HandleDataType | null {
  const def = NODE_DEFINITIONS[nodeType as NodeType];
  if (!def) return null;
  const output = def.outputs.find((o) => o.id === handleId);
  return output?.dataType ?? null;
}

function getInputDataType(nodeType: string, handleId: string): HandleDataType | null {
  const def = NODE_DEFINITIONS[nodeType as NodeType];
  if (!def) return null;
  const input = def.inputs.find((i) => i.id === handleId);
  return input?.dataType ?? null;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: "Untitled",
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeIds: [],
  history: [],
  historyIndex: -1,

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const state = get();
    if (!state.isValidConnection(connection)) return;

    // Prevent duplicate connections to the same target handle
    // (except for "images" handle which supports multiple)
    const targetNode = state.nodes.find((n) => n.id === connection.target);
    const isImagesHandle = connection.targetHandle === "images";

    if (!isImagesHandle) {
      const existingEdge = state.edges.find(
        (e) => e.target === connection.target && e.targetHandle === connection.targetHandle
      );
      if (existingEdge) {
        // Replace existing connection
        const filteredEdges = state.edges.filter((e) => e.id !== existingEdge.id);
        const newEdge: Edge = {
          id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          animated: true,
          style: { stroke: "#A855F7", strokeWidth: 2 },
        };
        state.pushHistory();
        set({ edges: [...filteredEdges, newEdge] });
        return;
      }
    }

    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    };

    state.pushHistory();
    set({ edges: [...state.edges, newEdge] });
  },

  addNode: (type, position) => {
    const state = get();
    const def = NODE_DEFINITIONS[type];
    if (!def) return;

    state.pushHistory();
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNode: Node = {
      id,
      type: def.type,
      position,
      data: {
        label: def.label,
        nodeType: def.type,
        ...getDefaultDataForType(type),
      },
    };

    set({ nodes: [...state.nodes, newNode] });
  },

  deleteNode: (nodeId) => {
    const state = get();
    state.pushHistory();
    set({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  deleteEdge: (edgeId) => {
    const state = get();
    state.pushHistory();
    set({ edges: state.edges.filter((e) => e.id !== edgeId) });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  isValidConnection: (connection) => {
    const state = get();
    const sourceNode = state.nodes.find((n) => n.id === connection.source);
    const targetNode = state.nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return false;
    if (connection.source === connection.target) return false;

    const sourceType = getOutputDataType(
      sourceNode.data.nodeType as string,
      connection.sourceHandle ?? ""
    );
    const targetType = getInputDataType(
      targetNode.data.nodeType as string,
      connection.targetHandle ?? ""
    );

    if (!sourceType || !targetType) return false;

    const allowed = CONNECTION_RULES[sourceType];
    if (!allowed.includes(targetType)) return false;

    // DAG validation: check for cycles
    if (wouldCreateCycle(state.edges, connection.source, connection.target)) {
      return false;
    }

    return true;
  },

  loadWorkflow: (id, name, nodes, edges, viewport) => {
    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
      history: [],
      historyIndex: -1,
    });
  },

  clearWorkflow: () => {
    set({
      workflowId: null,
      workflowName: "Untitled",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      history: [],
      historyIndex: -1,
    });
  },

  pushHistory: () => {
    const state = get();
    const entry: HistoryEntry = {
      nodes: structuredClone(state.nodes),
      edges: structuredClone(state.edges),
    };
    // Truncate any future entries (discard redo stack on new action)
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return;

    // Save current state as a "future" entry so redo can restore it
    const currentEntry: HistoryEntry = {
      nodes: structuredClone(state.nodes),
      edges: structuredClone(state.edges),
    };
    const newHistory = [...state.history];
    // If we're at the tip, append current state as the redo target
    if (state.historyIndex === state.history.length - 1) {
      newHistory.push(currentEntry);
    } else {
      newHistory[state.historyIndex + 1] = currentEntry;
    }

    const entry = state.history[state.historyIndex];
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      history: newHistory,
      historyIndex: state.historyIndex - 1,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 2) return;
    const entry = state.history[state.historyIndex + 2];
    if (!entry) return;
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      historyIndex: state.historyIndex + 2,
    });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 2,
}));

function getDefaultDataForType(type: NodeType): Record<string, unknown> {
  switch (type) {
    case "text":
      return { text: "", isRunning: false };
    case "uploadImage":
      return { imageUrl: null, fileName: null, isRunning: false };
    case "uploadVideo":
      return { videoUrl: null, fileName: null, isRunning: false };
    case "llm":
      return {
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        images: [],
        result: null,
        isRunning: false,
      };
    case "cropImage":
      return {
        imageUrl: null,
        xPercent: 0,
        yPercent: 0,
        widthPercent: 100,
        heightPercent: 100,
        result: null,
        isRunning: false,
      };
    case "extractFrame":
      return {
        videoUrl: null,
        timestamp: "0",
        result: null,
        isRunning: false,
      };
    default:
      return {};
  }
}

function wouldCreateCycle(edges: Edge[], newSource: string, newTarget: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }
  if (!adjacency.has(newSource)) adjacency.set(newSource, []);
  adjacency.get(newSource)!.push(newTarget);

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    for (const neighbor of adjacency.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }
    recursionStack.delete(node);
    return false;
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}
