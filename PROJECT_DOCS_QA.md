# Project Docs / Q&A (living doc)

If you ask me questions about this project, I’ll answer them **by updating this file**.

---

## Transloadit

### What is Transloadit?

**Transloadit** is a hosted file-processing + upload pipeline service.

- You upload a file to Transloadit’s **Assemblies API**.
- An “assembly” runs one or more **steps** (called “robots”) to process/transform the file.
- The output can be stored to your own storage (S3, GCS, etc.) or—if you don’t configure storage—returned on Transloadit’s **temporary CDN** (time-limited URLs).

In short: it’s “upload + processing + (optionally) storage/CDN”, exposed as an API.

### What is Transloadit doing in *this* project?

In this repo, Transloadit is used primarily for **getting a URL** (a CDN URL) for assets generated or chosen during workflows:

- **Client-side uploads (user selects a file)**
  - When the user picks an image/video in the workflow UI, the app uploads it to Transloadit and saves the returned URL into node state.
  - Code:
    - `src/components/nodes/upload-image-node.tsx` → calls `uploadToTransloadit(file, "image")`
    - `src/components/nodes/upload-video-node.tsx` → calls `uploadToTransloadit(file, "video")`
    - `src/lib/transloadit.ts` → implements `uploadToTransloadit()`

- **Server-side uploads (Trigger.dev tasks produce a buffer)**
  - Some tasks run FFmpeg to generate new images (crop output, extracted video frames).
  - Those tasks upload the generated `Buffer` to Transloadit so they can return a **public URL** as the task output.
  - Code:
    - `src/trigger/crop-image-task.ts` → FFmpeg crop → `uploadBufferToTransloadit(...)`
    - `src/trigger/extract-frame-task.ts` → FFmpeg frame extraction → `uploadBufferToTransloadit(...)`
    - `src/lib/transloadit-server.ts` → implements `uploadBufferToTransloadit()`

### How the upload works (implementation details)

Both the browser and server implementations hit:

- `POST https://api2.transloadit.com/assemblies`

and both use a **pass-through step**:

- step name: `passthrough`
- robot: `/file/filter`
- intent: accept the original file and expose it as a result on Transloadit’s **temporary CDN**

Then the code **polls** `assembly_ssl_url` until the assembly reports `ASSEMBLY_COMPLETED`, and extracts a URL (prefers `results.passthrough[0].ssl_url`, otherwise tries `:original` / `uploads`).

### Why do we need it?

This project’s workflow nodes and Trigger.dev tasks want to output a **URL** that other steps can consume (preview, feed into LLM nodes, etc.).

Transloadit provides:

- **One consistent “upload → URL” path** across browser + server tasks
- **No storage credentials** required in this setup (because it uses Transloadit’s tmp CDN)
- A clean integration point when outputs are generated server-side (FFmpeg)

### Environment variables used

- `NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY`
  - Used in **both** browser and server code.
  - If missing, the code falls back:
    - browser: returns `URL.createObjectURL(file)` (local-only, not shareable across devices)
    - server: returns a `data:${mime};base64,...` URL (can be large; not ideal for big outputs)

- `TRANSLOADIT_AUTH_SECRET`
  - Present in the repo’s env docs, but **currently not used** by `src/lib/transloadit-server.ts`.
  - That file only uses the key and does not sign requests.

### Important behavior / gotchas

- **Temporary URLs**: this repo’s Transloadit usage is explicitly “tmp CDN” style (no permanent storage configured). Expect URLs to expire.
- **Client key exposure**: `NEXT_PUBLIC_*` env vars are exposed to the browser. That’s fine for “public auth key” patterns, but it also means uploads happen directly from the client.
- **Polling**: uploads aren’t “done” until the assembly completes; the code polls up to ~30s (client) or ~120s (server) depending on the module defaults.

### Security note (important)

- **Do not commit secrets**: `nextflow/.env.local` contains sensitive keys/secrets (Clerk, DB, LLM providers, Trigger.dev, Transloadit). Keep it out of git.
- **If this repo was ever pushed with real secrets**: rotate those keys immediately.

---

## Q&A log

Add new questions and answers here (I’ll append entries).

### Q1: What is Transloadit and what is it doing in my project?

A1: See **Transloadit** section above.

