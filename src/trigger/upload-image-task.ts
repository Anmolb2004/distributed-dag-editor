import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const uploadImageTask = schemaTask({
  id: "upload-image-passthrough",
  schema: z.object({
    imageUrl: z.string(),
  }),
  retry: { maxAttempts: 1 },
  run: async (payload) => {
    if (!payload.imageUrl) throw new Error("No image uploaded");
    return { output: payload.imageUrl };
  },
});
