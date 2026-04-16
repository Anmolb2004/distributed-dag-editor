import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { uploadBufferToTransloadit } from "@/lib/transloadit-server";

const execFileAsync = promisify(execFile);

export const extractFrameTask = schemaTask({
  id: "extract-frame",
  schema: z.object({
    videoUrl: z.string(),
    timestamp: z.string().default("0"),
  }),
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "frame-"));
    const inputPath = path.join(tmpDir, "input.mp4");
    const outputPath = path.join(tmpDir, "frame.png");

    try {
      const response = await fetch(payload.videoUrl);
      if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(inputPath, buffer);

      let ffmpegBin: string;
      try {
        ffmpegBin = require("ffmpeg-static");
      } catch {
        ffmpegBin = "ffmpeg";
      }

      let seekTime = "0";

      if (payload.timestamp.endsWith("%")) {
        const durationResult = await execFileAsync(ffmpegBin, [
          "-i", inputPath,
          "-f", "null", "-",
        ]).catch((err) => {
          const match = (err.stderr as string)?.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
          if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const seconds = parseInt(match[3]);
            const fraction = parseInt(match[4]) / 100;
            return { totalSeconds: hours * 3600 + minutes * 60 + seconds + fraction };
          }
          return { totalSeconds: 10 };
        }) as unknown as { totalSeconds: number };

        const pct = parseFloat(payload.timestamp.replace("%", "")) / 100;
        seekTime = String(durationResult.totalSeconds * pct);
      } else {
        seekTime = payload.timestamp;
      }

      await execFileAsync(ffmpegBin, [
        "-ss", seekTime,
        "-i", inputPath,
        "-vframes", "1",
        "-y",
        outputPath,
      ]);

      const outputBuffer = await fs.readFile(outputPath);

      // Upload extracted frame to Transloadit for CDN URL
      const url = await uploadBufferToTransloadit(outputBuffer, "frame.png", "image/png");

      return { output: url };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  },
});
