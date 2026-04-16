import type { Edge, Node } from "@xyflow/react";

export interface ExecutionLayer {
  nodeIds: string[];
}

/**
 * Resolve a DAG into execution layers for parallel execution.
 * Each layer contains nodes that can run concurrently.
 * A node only appears in a layer after all its dependencies have been satisfied.
 */
export function resolveExecutionOrder(
  nodes: Node[],
  edges: Edge[],
  targetNodeIds?: string[]
): ExecutionLayer[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // If targeting specific nodes, find all upstream dependencies
  const relevantNodeIds = targetNodeIds?.length
    ? getUpstreamNodes(targetNodeIds, edges, nodeMap)
    : new Set(nodes.map((n) => n.id));

  for (const id of relevantNodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const edge of edges) {
    if (!relevantNodeIds.has(edge.source) || !relevantNodeIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const layers: ExecutionLayer[] = [];
  const remaining = new Set(relevantNodeIds);

  while (remaining.size > 0) {
    const readyNodes: string[] = [];

    for (const id of remaining) {
      if ((inDegree.get(id) ?? 0) === 0) {
        readyNodes.push(id);
      }
    }

    if (readyNodes.length === 0) {
      throw new Error("Cycle detected in workflow graph");
    }

    layers.push({ nodeIds: readyNodes });

    for (const id of readyNodes) {
      remaining.delete(id);
      for (const target of adjacency.get(id) ?? []) {
        inDegree.set(target, (inDegree.get(target) ?? 0) - 1);
      }
    }
  }

  return layers;
}

/**
 * Given a set of target node IDs, find all upstream dependencies.
 */
function getUpstreamNodes(
  targetIds: string[],
  edges: Edge[],
  nodeMap: Map<string, Node>
): Set<string> {
  const result = new Set<string>();
  const reverseAdj = new Map<string, string[]>();

  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target)!.push(edge.source);
  }

  const queue = [...targetIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (result.has(id)) continue;
    if (!nodeMap.has(id)) continue;
    result.add(id);
    for (const dep of reverseAdj.get(id) ?? []) {
      if (!result.has(dep)) queue.push(dep);
    }
  }

  return result;
}

/**
 * Get inputs for a node from connected edges and upstream outputs.
 */
export function resolveNodeInputs(
  nodeId: string,
  edges: Edge[],
  nodeOutputs: Map<string, Record<string, unknown>>,
  nodeDataMap: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  const nodeData = nodeDataMap.get(nodeId) ?? {};

  // Copy manual values from node data as defaults
  Object.assign(inputs, nodeData);

  // Override with connected values
  const imageUrls: string[] = [];
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  for (const edge of incomingEdges) {
    const sourceOutputs = nodeOutputs.get(edge.source);
    if (sourceOutputs && edge.targetHandle) {
      const sourceValue = sourceOutputs[edge.sourceHandle ?? "output"];
      if (sourceValue !== undefined) {
        // For the "images" handle, collect into an array instead of overwriting
        if (edge.targetHandle === "images" && typeof sourceValue === "string") {
          imageUrls.push(sourceValue);
        } else {
          inputs[edge.targetHandle] = sourceValue;
        }
      }
    }
  }

  // Set the deduplicated image URLs array
  if (imageUrls.length > 0) {
    inputs._imageUrls = [...new Set(imageUrls)];
  }

  return inputs;
}
