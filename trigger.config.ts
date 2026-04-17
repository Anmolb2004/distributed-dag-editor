import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_dyxqdcnjxhjfgwlcxdyc",
  dirs: ["./src/trigger"],
  // v4 requires this; 600s covers FFmpeg video frame extraction worst case.
  maxDuration: 600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 2,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      randomize: true,
    },
  },
  build: {
    // Installs a real ffmpeg binary into the Trigger.dev Docker image so
    // the crop-image and extract-frame tasks can spawn it at runtime.
    extensions: [ffmpeg()],
  },
});
