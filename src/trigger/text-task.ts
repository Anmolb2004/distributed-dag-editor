import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const textTask = schemaTask({
  id: "text-passthrough",
  schema: z.object({
    text: z.string().default(""),
  }),
  retry: { maxAttempts: 1 },
  run: async (payload) => {
    return { output: payload.text };
  },
});
