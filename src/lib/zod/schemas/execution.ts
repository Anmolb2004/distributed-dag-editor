import { z } from "zod";

export const executeWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  scope: z.enum(["FULL", "PARTIAL", "SINGLE"]).default("FULL"),
  targetNodeIds: z.array(z.string()).optional().default([]),
});

export type ExecuteWorkflowInput = z.infer<typeof executeWorkflowSchema>;
