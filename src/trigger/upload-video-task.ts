import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const uploadVideoTask = schemaTask({
  id: "upload-video-passthrough",
  schema: z.object({
    videoUrl: z.string(),
  }),
  retry: { maxAttempts: 1 },
  run: async (payload) => {
    if (!payload.videoUrl) throw new Error("No video uploaded");
    return { output: payload.videoUrl };
  },
});
