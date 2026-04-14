"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  SelectionMode,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore, type WorkflowRunEntry } from "@/store/history-store";
import { useExecution } from "@/lib/hooks/use-execution";
import { ExecutionProvider } from "@/lib/hooks/execution-context";
import { LeftSidebar } from "@/components/editor/left-sidebar";
import { RightSidebar } from "@/components/editor/right-sidebar";
import { EditorHeader } from "@/components/editor/editor-header";
import { CanvasToolbar } from "@/components/editor/canvas-toolbar";
import { RunPanel } from "@/components/editor/run-panel";
import { ContextMenu } from "@/components/editor/context-menu";
import { TextNode } from "@/components/nodes/text-node";
import { UploadImageNode } from "@/components/nodes/upload-image-node";
import { UploadVideoNode } from "@/components/nodes/upload-video-node";
import { LlmNode } from "@/components/nodes/llm-node";
import { CropImageNode } from "@/components/nodes/crop-image-node";
import { ExtractFrameNode } from "@/components/nodes/extract-frame-node";
import { type NodeType } from "@/types/workflow";

const nodeTypes = {
  text: TextNode,
  uploadImage: UploadImageNode,
  uploadVideo: UploadVideoNode,
  llm: LlmNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
interface WorkflowData {
  id: string;
  name: string;
  flowState: any;
  runs: Array<{
    id: string;
    status: string;
    scope: string;
    targetNodeIds: string[];
    startedAt: Date;
    finishedAt: Date | null;
    durationMs: number | null;
    nodeRuns: Array<{
      id: string;
      nodeId: string;
      nodeType: string;
      nodeLabel: string | null;
      status: string;
      inputs: any;
      outputs: any;
      error: string | null;
      durationMs: number | null;
    }>;
  }>;
}

function WorkflowEditorInner({ workflow }: { workflow: WorkflowData }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    loadWorkflow,
    addNode,
    deleteNode,
    setViewport,
    selectedNodeIds,
    setSelectedNodeIds,
  } = useWorkflowStore();

  const { setRuns } = useHistoryStore();
  const { runFull, runSelected, runSingle, saveWorkflow } = useExecution();

  // Load workflow on mount
  useEffect(() => {
    const flow = workflow.flowState as {
      nodes?: Node[];
      edges?: Edge[];
      viewport?: { x: number; y: number; zoom: number };
    };
    loadWorkflow(
      workflow.id,
      workflow.name,
      flow?.nodes ?? [],
      flow?.edges ?? [],
      flow?.viewport
    );

    const mappedRuns: WorkflowRunEntry[] = workflow.runs.map((run) => ({
      id: run.id,
      workflowId: workflow.id,
      status: run.status.toLowerCase() as WorkflowRunEntry["status"],
      scope: run.scope.toLowerCase() as WorkflowRunEntry["scope"],
      targetNodeIds: run.targetNodeIds,
      startedAt: new Date(run.startedAt).toISOString(),
      finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : undefined,
      durationMs: run.durationMs ?? undefined,
      nodeRuns: run.nodeRuns.map((nr) => ({
        nodeId: nr.nodeId,
        nodeType: nr.nodeType,
        nodeLabel: nr.nodeLabel ?? nr.nodeType,
        status: nr.status.toLowerCase() as "pending" | "running" | "success" | "failed" | "skipped",
        inputs: nr.inputs as Record<string, unknown>,
        outputs: nr.outputs as Record<string, unknown>,
        error: nr.error ?? undefined,
        durationMs: nr.durationMs ?? undefined,
      })),
    }));
    setRuns(mappedRuns);
  }, [workflow, loadWorkflow, setRuns]);

  // Auto-save debounced (5s after last change)
  useEffect(() => {
    if (!useWorkflowStore.getState().workflowId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveWorkflow();
    }, 5000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [nodes, edges, saveWorkflow]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd+S to save (works even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveWorkflow();
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          useWorkflowStore.getState().redo();
        } else {
          useWorkflowStore.getState().undo();
        }
      }

      if (e.key === "n" || e.key === "N") {
        setLeftSidebarOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/nextflow-node") as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelectedNodeIds(selectedNodes.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  const onMoveEnd = useCallback(
    (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDuplicate = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      addNode(node.type as NodeType, {
        x: node.position.x + 50,
        y: node.position.y + 50,
      });
    },
    [nodes, addNode]
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <EditorHeader
        leftSidebarOpen={leftSidebarOpen}
        setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar isOpen={leftSidebarOpen} onClose={() => setLeftSidebarOpen(!leftSidebarOpen)} />

        <div ref={reactFlowWrapper} className="flex-1">
          <ExecutionProvider runSingle={runSingle}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection as (edge: Edge | Connection) => boolean}
            nodeTypes={nodeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDoubleClick={() => setLeftSidebarOpen(true)}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onSelectionChange={onSelectionChange}
            onMoveEnd={onMoveEnd}
            selectionMode={SelectionMode.Partial}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#A855F7", strokeWidth: 2 },
            }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333333" />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  text: "#EAB308", uploadImage: "#3B82F6", uploadVideo: "#8B5CF6",
                  llm: "#10B981", cropImage: "#F97316", extractFrame: "#EC4899",
                };
                return colors[node.type ?? ""] ?? "#A855F7";
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
              pannable
              zoomable
            />
            <Controls showInteractive={false} />

            {/* Run Panel (top-left, like Krea's Run/Stop nodes buttons) */}
            <Panel position="top-left">
              <RunPanel
                onRunFull={runFull}
                onRunSelected={() => runSelected(selectedNodeIds)}
                selectedCount={selectedNodeIds.length}
                hasNodes={nodes.length > 0}
              />
            </Panel>

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none mt-[35vh]">
                <div className="text-center">
                  <p className="text-sm text-muted">Add a node</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Double click the canvas or press{" "}
                    <kbd className="rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-mono">N</kbd>
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
          </ExecutionProvider>
        </div>

        <RightSidebar isOpen={rightSidebarOpen} onClose={() => setRightSidebarOpen(false)} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
          onDelete={(id) => deleteNode(id)}
          onDuplicate={handleDuplicate}
          onRun={(id) => runSingle(id)}
          onFitView={() => fitView({ padding: 0.2, duration: 300 })}
        />
      )}

      <CanvasToolbar />
    </div>
  );
}

export function WorkflowEditor({ workflow }: { workflow: WorkflowData }) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner workflow={workflow} />
    </ReactFlowProvider>
  );
}
