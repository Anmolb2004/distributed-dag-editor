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

      let seekTime = "0";

      if (payload.timestamp.trim().endsWith("%")) {
        const totalSeconds = await probeVideoDuration(inputPath);
        const pct = parseFloat(payload.timestamp.replace("%", "").trim()) / 100;
        if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
          throw new Error(
            `Could not determine video duration from ${payload.videoUrl}; timestamp="${payload.timestamp}"`
          );
        }
        if (!Number.isFinite(pct) || pct < 0 || pct > 1) {
          throw new Error(`Invalid percentage timestamp: "${payload.timestamp}"`);
        }
        seekTime = (totalSeconds * pct).toFixed(3);
      } else {
        const parsed = Number(payload.timestamp);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`Invalid timestamp: "${payload.timestamp}" (expected seconds or "NN%")`);
        }
        seekTime = String(parsed);
      }

      try {
        await execFileAsync("ffmpeg", [
          "-ss", seekTime,
          "-i", inputPath,
          "-vframes", "1",
          "-y",
          outputPath,
        ]);
      } catch (err) {
        const stderr = (err as { stderr?: string }).stderr ?? "";
        throw new Error(
          `ffmpeg frame extraction failed (ss=${seekTime}): ${stderr.slice(-1000) || (err as Error).message}`
        );
      }

      const outputBuffer = await fs.readFile(outputPath);

      // Upload extracted frame to Transloadit for CDN URL
      const url = await uploadBufferToTransloadit(outputBuffer, "frame.png", "image/png");

      return { output: url };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  },
});

/**
 * Read a video's duration in seconds using ffprobe.
 * Falls back to parsing `ffmpeg -i` stderr if ffprobe isn't available.
 */
async function probeVideoDuration(inputPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
  } catch {
    // ffprobe unavailable or errored; fall through to ffmpeg stderr parsing.
  }

  // Fallback: ffmpeg -i writes "Duration: HH:MM:SS.ss" to stderr and then
  // the command exits 0 (for -f null -) or non-zero (if no input arg).
  // Either way we can read stderr from both resolution and rejection.
  const readStderr = async (): Promise<string> => {
    try {
      const { stderr } = await execFileAsync("ffmpeg", [
        "-i", inputPath,
        "-f", "null", "-",
      ]);
      return stderr ?? "";
    } catch (err) {
      return (err as { stderr?: string }).stderr ?? "";
    }
  };

  const stderr = await readStderr();
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  if (match) {
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const fraction = parseInt(match[4]) / 100;
    return hours * 3600 + minutes * 60 + seconds + fraction;
  }

  return 0;
}
