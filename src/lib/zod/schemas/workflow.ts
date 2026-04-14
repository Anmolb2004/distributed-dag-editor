import { z } from "zod";

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional().default("Untitled"),
  description: z.string().max(2000).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  flowState: z.record(z.string(), z.unknown()).optional(),
});

export const workflowIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
