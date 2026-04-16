import { db } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { ApiError } from "@/lib/api/errors";
import { executeWorkflowSchema } from "@/lib/zod/schemas/execution";
import { resolveExecutionOrder, resolveNodeInputs } from "@/lib/workflow/dag";
import type { Node, Edge } from "@xyflow/react";
import { tasks, runs } from "@trigger.dev/sdk";

export const POST = withAuth(async (req, { userId }) => {
  const body = await req.json();
  const input = executeWorkflowSchema.parse(body);

  const workflow = await db.workflow.findFirst({
    where: { id: input.workflowId, clerkUserId: userId },
  });
  if (!workflow) throw new ApiError("NOT_FOUND", "Workflow not found");

  const flowState = workflow.flowState as {
    nodes?: Node[];
    edges?: Edge[];
  };
  const nodes = flowState?.nodes ?? [];
  const edges = flowState?.edges ?? [];

  if (nodes.length === 0) {
    throw new ApiError("BAD_REQUEST", "Workflow has no nodes");
  }

  let targetNodeIds: string[] | undefined;
  if (input.scope === "SINGLE" && input.targetNodeIds.length === 1) {
    targetNodeIds = input.targetNodeIds;
  } else if (input.scope === "PARTIAL" && input.targetNodeIds.length > 0) {
    targetNodeIds = input.targetNodeIds;
  }

  const layers = resolveExecutionOrder(nodes, edges, targetNodeIds);
  const allNodeIds = layers.flatMap((l) => l.nodeIds);

  const run = await db.workflowRun.create({
    data: {
      workflowId: input.workflowId,
      clerkUserId: userId,
      status: "RUNNING",
      scope: input.scope,
      targetNodeIds: input.targetNodeIds,
      nodeRuns: {
        create: allNodeIds.map((nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          return {
            nodeId,
            nodeType: (node?.data?.nodeType as string) ?? node?.type ?? "unknown",
            nodeLabel: (node?.data?.label as string) ?? null,
            status: "PENDING",
          };
        }),
      },
    },
    include: { nodeRuns: true },
  });

  // Execute layers sequentially, nodes within each layer in parallel.
  // If a node fails, downstream dependents are skipped. Independent branches continue.
  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const failedNodeIds = new Set<string>();
  const skippedNodeIds = new Set<string>();
  const nodeDataMap = new Map(
    nodes.map((n) => [n.id, (n.data ?? {}) as Record<string, unknown>])
  );
  let hasFailure = false;
  let hasSuccess = false;
  const startTime = Date.now();

  const upstreamDeps = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!upstreamDeps.has(edge.target)) upstreamDeps.set(edge.target, new Set());
    upstreamDeps.get(edge.target)!.add(edge.source);
  }

  for (const layer of layers) {
    await Promise.allSettled(
      layer.nodeIds.map(async (nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const nodeRun = run.nodeRuns.find((nr) => nr.nodeId === nodeId);
        if (!nodeRun) return;

        const deps = upstreamDeps.get(nodeId) ?? new Set();
        const hasFailedUpstream = [...deps].some(
          (depId) => failedNodeIds.has(depId) || skippedNodeIds.has(depId)
        );

        if (hasFailedUpstream) {
          skippedNodeIds.add(nodeId);
          await db.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "SKIPPED",
              error: "Skipped: upstream dependency failed",
              finishedAt: new Date(),
              durationMs: 0,
            },
          });
          return;
        }

        const nodeType = (node.data?.nodeType as string) ?? node.type;
        const inputs = resolveNodeInputs(nodeId, edges, nodeOutputs, nodeDataMap);

        await db.nodeRun.update({
          where: { id: nodeRun.id },
          data: { status: "RUNNING", startedAt: new Date() },
        });

        const nodeStart = Date.now();

        try {
          const output = await executeNode(nodeType, inputs, node);
          const duration = Date.now() - nodeStart;

          nodeOutputs.set(nodeId, output);
          hasSuccess = true;

          await db.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "SUCCESS",
              outputs: JSON.parse(JSON.stringify(output)),
              inputs: JSON.parse(JSON.stringify(inputs)),
              finishedAt: new Date(),
              durationMs: duration,
            } as Parameters<typeof db.nodeRun.update>[0]["data"],
          });
        } catch (err) {
          const duration = Date.now() - nodeStart;
          hasFailure = true;
          failedNodeIds.add(nodeId);

          await db.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "FAILED",
              error: err instanceof Error ? err.message : "Unknown error",
              inputs: JSON.parse(JSON.stringify(inputs)),
              finishedAt: new Date(),
              durationMs: duration,
            } as Parameters<typeof db.nodeRun.update>[0]["data"],
          });
        }
      })
    );
  }

  const totalDuration = Date.now() - startTime;

  const finalStatus =
    hasFailure && hasSuccess ? "PARTIAL" :
    hasFailure ? "FAILED" :
    "SUCCESS";

  const updatedRun = await db.workflowRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      finishedAt: new Date(),
      durationMs: totalDuration,
    },
    include: { nodeRuns: { orderBy: { startedAt: "asc" } } },
  });

  return Response.json({ run: updatedRun, nodeOutputs: Object.fromEntries(nodeOutputs) });
});

/**
 * Trigger a Trigger.dev task and wait for completion via subscribeToRun.
 */
async function triggerAndWaitForResult<T>(
  taskId: string,
  payload: unknown
): Promise<T> {
  const handle = await tasks.trigger(taskId, payload);

  for await (const run of runs.subscribeToRun(handle.id)) {
    if (run.status === "COMPLETED") {
      return run.output as T;
    }
    if (
      run.status === "FAILED" ||
      run.status === "CANCELED" ||
      run.status === "CRASHED" ||
      run.status === "SYSTEM_FAILURE" ||
      run.status === "EXPIRED" ||
      run.status === "TIMED_OUT"
    ) {
      throw new Error(`Task ${taskId} failed with status: ${run.status}`);
    }
  }

  throw new Error(`Task ${taskId} subscription ended without completion`);
}

/**
 * ALL node executions go through Trigger.dev tasks (non-negotiable per assignment).
 */
async function executeNode(
  nodeType: string,
  inputs: Record<string, unknown>,
  node: Node
): Promise<Record<string, unknown>> {
  switch (nodeType) {
    case "text": {
      const text = (inputs.text as string) ?? (node.data?.text as string) ?? "";
      return triggerAndWaitForResult("text-passthrough", { text });
    }

    case "uploadImage": {
      const url = (inputs.imageUrl as string) ?? (node.data?.imageUrl as string);
      if (!url) throw new Error("No image uploaded yet. Click the node and upload an image first.");
      return triggerAndWaitForResult("upload-image-passthrough", { imageUrl: url });
    }

    case "uploadVideo": {
      const url = (inputs.videoUrl as string) ?? (node.data?.videoUrl as string);
      if (!url) throw new Error("No video uploaded yet. Click the node and upload a video first.");
      return triggerAndWaitForResult("upload-video-passthrough", { videoUrl: url });
    }

    case "llm": {
      const model = (inputs.model as string) ?? (node.data?.model as string) ?? "gemini-2.5-flash";
      const systemPrompt =
        (inputs.system_prompt as string) ?? (node.data?.systemPrompt as string) ?? "";
      const userMessage =
        (inputs.user_message as string) ?? (node.data?.userMessage as string) ?? "";

      if (!userMessage) throw new Error("User message is required. Type a prompt or connect a Text node to the user_message input.");

      // Collect images from _imageUrls array (no duplicates)
      const imageUrls = (inputs._imageUrls as string[]) ?? [];

      return triggerAndWaitForResult("llm-execute", {
        model,
        systemPrompt: systemPrompt || undefined,
        userMessage,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    }

    case "cropImage": {
      const imageUrl =
        (inputs.image_url as string) ??
        (inputs.imageUrl as string) ??
        (node.data?.imageUrl as string);
      if (!imageUrl) throw new Error("No image connected. Connect an Upload Image node to the image input handle, then run again.");

      return triggerAndWaitForResult("crop-image", {
        imageUrl,
        xPercent: Number(inputs.x_percent ?? inputs.xPercent ?? 0),
        yPercent: Number(inputs.y_percent ?? inputs.yPercent ?? 0),
        widthPercent: Number(inputs.width_percent ?? inputs.widthPercent ?? 100),
        heightPercent: Number(inputs.height_percent ?? inputs.heightPercent ?? 100),
      });
    }

    case "extractFrame": {
      const videoUrl =
        (inputs.video_url as string) ??
        (inputs.videoUrl as string) ??
        (node.data?.videoUrl as string);
      if (!videoUrl) throw new Error("No video connected. Connect an Upload Video node to the video input handle, then run again.");

      return triggerAndWaitForResult("extract-frame", {
        videoUrl,
        timestamp: String(inputs.timestamp ?? "0"),
      });
    }

    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}
