import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { uploadBufferToTransloadit } from "@/lib/transloadit-server";

const execFileAsync = promisify(execFile);

export const cropImageTask = schemaTask({
  id: "crop-image",
  schema: z.object({
    imageUrl: z.string(),
    xPercent: z.number().min(0).max(100).default(0),
    yPercent: z.number().min(0).max(100).default(0),
    widthPercent: z.number().min(0).max(100).default(100),
    heightPercent: z.number().min(0).max(100).default(100),
  }),
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "crop-"));
    const inputPath = path.join(tmpDir, "input.png");
    const outputPath = path.join(tmpDir, "output.png");

    try {
      const response = await fetch(payload.imageUrl);
      if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(inputPath, buffer);

      const cropFilter = `crop=iw*${payload.widthPercent / 100}:ih*${payload.heightPercent / 100}:iw*${payload.xPercent / 100}:ih*${payload.yPercent / 100}`;

      try {
        await execFileAsync("ffmpeg", [
          "-i", inputPath,
          "-vf", cropFilter,
          "-y",
          outputPath,
        ]);
      } catch (err) {
        // Surface ffmpeg stderr so dashboard errors are actually actionable.
        const stderr = (err as { stderr?: string }).stderr ?? "";
        throw new Error(
          `ffmpeg crop failed (filter=${cropFilter}): ${stderr.slice(-1000) || (err as Error).message}`
        );
      }

      const outputBuffer = await fs.readFile(outputPath);

      // Upload cropped image to Transloadit for CDN URL
      const url = await uploadBufferToTransloadit(outputBuffer, "cropped.png", "image/png");

      return { output: url };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  },
});
