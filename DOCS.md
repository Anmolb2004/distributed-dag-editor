# NextFlow - Complete Project Documentation

This document explains every part of the NextFlow project in detail, step by step.

---

## Table of Contents

1. [What Is NextFlow?](#1-what-is-nextflow)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack Deep Dive](#3-tech-stack-deep-dive)
4. [Project Structure Explained](#4-project-structure-explained)
5. [Authentication Flow](#5-authentication-flow)
6. [Database Schema](#6-database-schema)
7. [The 6 Node Types](#7-the-6-node-types)
8. [Workflow Execution Engine](#8-workflow-execution-engine)
9. [Trigger.dev Background Tasks](#9-triggerdev-background-tasks)
10. [State Management](#10-state-management)
11. [API Routes](#11-api-routes)
12. [UI Components](#12-ui-components)
13. [Sample Workflow](#13-sample-workflow)
14. [How to Run Everything](#14-how-to-run-everything)

---

## 1. What Is NextFlow?

NextFlow is a **visual LLM workflow builder** — a pixel-perfect clone of Krea.ai's workflow interface, specialized for Large Language Model workflows.

Users can:
- **Drag and drop** 6 different node types onto a canvas
- **Connect nodes** with animated edges to build a processing pipeline
- **Upload images and videos** via Transloadit
- **Run Google Gemini AI** with text and image inputs (multimodal)
- **Crop images** and **extract video frames** using FFmpeg
- **Execute workflows** with parallel branch processing
- **View execution history** with node-level detail (inputs, outputs, errors, timing)
- **Save, load, export, and import** workflows as JSON

---

## 2. Architecture Overview

```
┌──────────────┐     ┌─────────────┐     ┌───────────────┐
│   Browser     │────▶│  Next.js     │────▶│  PostgreSQL    │
│   (React)     │◀────│  App Router  │◀────│  (Neon)        │
└──────────────┘     └──────┬──────┘     └───────────────┘
                            │
                            │ tasks.trigger()
                            ▼
                     ┌─────────────┐
                     │ Trigger.dev  │
                     │ (Background) │
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Gemini   │ │ FFmpeg   │ │ FFmpeg   │
        │ LLM API  │ │ Crop     │ │ Extract  │
        └──────────┘ └──────────┘ └──────────┘
```

**Data flow:**
1. User builds a workflow on the canvas (React Flow nodes + edges)
2. Clicks "Run" → browser sends POST to `/api/execute`
3. The API resolves the DAG into parallel layers
4. For each layer, all independent nodes execute concurrently
5. LLM/Crop/Extract nodes trigger Trigger.dev background tasks
6. Results flow back, get stored in PostgreSQL, and update the UI

---

## 3. Tech Stack Deep Dive

### Next.js 16 (App Router)
- Server Components for data fetching (dashboard, workflow pages)
- Client Components for interactive UI (editor, nodes)
- API Route Handlers for CRUD and execution
- Middleware for auth protection (via Clerk)

### TypeScript (Strict Mode)
- Every file is TypeScript
- Strict type checking enabled in `tsconfig.json`
- Zod v4 for runtime validation on all API inputs

### React Flow v12
- Visual node-based workflow canvas
- Custom node components (6 types)
- Type-safe connection validation
- Built-in MiniMap, Controls, Background

### Prisma 7 + Neon PostgreSQL
- **Prisma 7** with the `@prisma/adapter-neon` driver adapter
- Serverless PostgreSQL via Neon
- Schema defines: `Workflow`, `WorkflowRun`, `NodeRun`
- Connection is configured in `prisma.config.ts` (reads from `.env`)

### Clerk Authentication
- Sign-in and sign-up pages at `/sign-in` and `/sign-up`
- Middleware protects all routes except public ones
- `withAuth` HOC wraps API routes (inspired by Dub's `withWorkspace`)
- All workflows are scoped to the authenticated user's `clerkUserId`

### Trigger.dev v4
- Background task execution for heavy operations
- 3 task types: LLM (Gemini), Crop Image (FFmpeg), Extract Frame (FFmpeg)
- Tasks are defined in `src/trigger/` directory
- Triggered from API routes via `tasks.trigger()` + `runs.subscribeToRun()`

### Transloadit
- Client-side file uploads for images and videos
- Supports: jpg, png, webp, gif (images) and mp4, mov, webm, m4v (videos)
- Falls back to local object URLs when Transloadit key is not configured

### Zustand
- Two stores: `workflow-store` (graph state) and `history-store` (run history)
- Workflow store manages: nodes, edges, viewport, undo/redo, selection
- History store manages: run list, selected run, node-level details

---

## 4. Project Structure Explained

```
nextflow/
├── prisma/
│   ├── schema.prisma        # Database models (Workflow, WorkflowRun, NodeRun)
│   └── seed.ts              # Seeds the "Product Marketing Kit Generator" template
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/
│   │   │   ├── execute/route.ts          # POST - Execute a workflow
│   │   │   ├── workflows/route.ts        # GET (list) + POST (create)
│   │   │   └── workflows/[id]/
│   │   │       ├── route.ts              # GET + PATCH + DELETE a workflow
│   │   │       └── runs/route.ts         # GET execution history
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Server: fetch workflows, auto-seed
│   │   │   └── loading.tsx               # Skeleton loader
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   ├── workflow/[id]/
│   │   │   ├── page.tsx                  # Server: fetch workflow + runs
│   │   │   └── loading.tsx               # Loading spinner
│   │   ├── error.tsx                     # Global error boundary
│   │   ├── not-found.tsx                 # 404 page
│   │   ├── globals.css                   # Theme, animations, React Flow overrides
│   │   ├── layout.tsx                    # Root layout (fonts, metadata)
│   │   ├── page.tsx                      # Root redirect (→ dashboard or sign-in)
│   │   └── providers.tsx                 # ClerkProvider + Toaster
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── dashboard-client.tsx      # Workflow grid, CRUD, search, import
│   │   ├── editor/
│   │   │   ├── workflow-editor.tsx        # Main editor (React Flow + sidebars)
│   │   │   ├── editor-header.tsx          # Top bar (name, save, history, export)
│   │   │   ├── left-sidebar.tsx           # Node palette (Quick Access, drag/click)
│   │   │   ├── right-sidebar.tsx          # Execution history panel
│   │   │   ├── canvas-toolbar.tsx         # Bottom bar (undo/redo, zoom, tidy)
│   │   │   ├── run-panel.tsx              # Floating "Run nodes" button
│   │   │   └── context-menu.tsx           # Right-click menu (run/delete/duplicate)
│   │   └── nodes/
│   │       ├── node-shell.tsx             # Shared wrapper (border, glow, run btn)
│   │       ├── text-node.tsx              # Textarea with output handle
│   │       ├── upload-image-node.tsx       # File upload → Transloadit → preview
│   │       ├── upload-video-node.tsx       # File upload → Transloadit → player
│   │       ├── llm-node.tsx               # Model selector, prompts, inline result
│   │       ├── crop-image-node.tsx         # Image input + 4 crop params + preview
│   │       └── extract-frame-node.tsx      # Video input + timestamp + preview
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── errors.ts                 # ApiError class + handleApiError
│   │   │   └── with-auth.ts              # withAuth HOC (Dub-inspired pattern)
│   │   ├── hooks/
│   │   │   ├── use-execution.ts           # Hook: trigger execution, update nodes
│   │   │   └── execution-context.tsx       # React context for per-node run
│   │   ├── workflow/
│   │   │   └── dag.ts                     # DAG resolver + parallel layer computation
│   │   ├── zod/schemas/
│   │   │   ├── workflow.ts                # createWorkflowSchema, updateWorkflowSchema
│   │   │   └── execution.ts               # executeWorkflowSchema
│   │   ├── db.ts                          # Prisma client singleton
│   │   ├── format.ts                      # Date/time formatting helpers
│   │   ├── transloadit.ts                 # Transloadit upload + polling
│   │   ├── sample-workflow.ts             # Inline sample workflow definition
│   │   ├── seed-user-workflow.ts           # Auto-seed for first-time users
│   │   └── utils.ts                       # cn() utility (tailwind-merge + clsx)
│   │
│   ├── store/
│   │   ├── workflow-store.ts              # Zustand: nodes, edges, undo/redo, addNode
│   │   └── history-store.ts               # Zustand: runs, nodeRuns, selectedRunId
│   │
│   ├── trigger/
│   │   ├── llm-task.ts                    # Gemini API call (text + images → text)
│   │   ├── crop-image-task.ts             # FFmpeg crop with % params → base64 PNG
│   │   └── extract-frame-task.ts           # FFmpeg frame extract → base64 PNG
│   │
│   ├── types/
│   │   └── workflow.ts                    # NODE_DEFINITIONS, CONNECTION_RULES, types
│   │
│   └── middleware.ts                      # Clerk auth middleware
│
├── trigger.config.ts                      # Trigger.dev project config
├── prisma.config.ts                       # Prisma CLI config (datasource URL)
├── next.config.ts                         # Next.js config (images, serverActions)
├── tsconfig.json                          # TypeScript config (strict, paths)
├── package.json                           # Dependencies + scripts
└── .env.local                             # Environment variables (gitignored)
```

---

## 5. Authentication Flow

1. User visits `/` → redirected to `/sign-in` (if not logged in) or `/dashboard`
2. Clerk handles sign-in/sign-up via embedded components
3. After auth, Clerk sets a session cookie
4. `middleware.ts` intercepts every request:
   - Public routes (`/`, `/sign-in`, `/sign-up`) → allowed
   - All other routes → `auth.protect()` ensures valid session
5. API routes use `withAuth()` wrapper:
   - Extracts `userId` from Clerk session
   - Passes it to the handler function
   - Rejects unauthorized requests with 401

**Key file: `src/lib/api/with-auth.ts`**
- Inspired by Dub's `withWorkspace` pattern
- Wraps any API handler with auth + error handling
- Every API route is a thin function that just does business logic

---

## 6. Database Schema

### Workflow
- Stores the React Flow state as JSON (`flowState` field)
- Scoped to a user via `clerkUserId`
- Has a name, optional description, optional thumbnail

### WorkflowRun
- Records each execution (full, partial, or single node)
- Tracks: status (PENDING/RUNNING/SUCCESS/FAILED/PARTIAL), scope, timing
- Links to multiple `NodeRun` records

### NodeRun
- Per-node execution detail within a run
- Stores: nodeId, nodeType, status, inputs (JSON), outputs (JSON), error, duration
- This is what powers the expandable history in the right sidebar

**Relationships:**
```
Workflow  1──▶ Many  WorkflowRun  1──▶ Many  NodeRun
```

---

## 7. The 6 Node Types

### 1. Text Node (`text`)
- Simple textarea for entering text
- Has an output handle that sends the text value to connected nodes
- Used for system prompts, user messages, product details, etc.

### 2. Upload Image Node (`uploadImage`)
- File picker that accepts: jpg, jpeg, png, webp, gif
- Uploads via Transloadit (polls for assembly completion)
- Shows image preview after upload
- Output handle sends the image URL

### 3. Upload Video Node (`uploadVideo`)
- File picker that accepts: mp4, mov, webm, m4v
- Same Transloadit upload flow
- Shows video player preview
- Output handle sends the video URL

### 4. Run Any LLM Node (`llm`)
- **Model selector**: Gemini 2.5 Flash, Pro, Flash-Lite, 2.0 Flash
- **3 input handles**: system_prompt (text), user_message (text), images (image, multi)
- **1 output handle**: text response
- When a handle is connected, the manual input field gets disabled (greyed out)
- Result displays **inline on the node** (not a separate output node)
- Executes via Trigger.dev → calls Google Gemini API with vision support

### 5. Crop Image Node (`cropImage`)
- **5 input handles**: image_url (required), x_percent, y_percent, width_percent, height_percent
- All percentage params can be set manually OR via connected nodes
- Executes via Trigger.dev → FFmpeg crop filter
- Shows cropped image preview

### 6. Extract Frame from Video Node (`extractFrame`)
- **2 input handles**: video_url (required), timestamp (e.g. "5" for 5 seconds or "50%" for middle)
- Executes via Trigger.dev → FFmpeg frame extraction
- Shows extracted frame preview

### Type-Safe Connections
Each handle has a `dataType` (text, image, video, number). The connection rules are:
- text → text only
- image → image only
- video → video only
- number → number OR text (numbers can feed into text inputs)

Invalid connections are **prevented** — the edge simply won't connect.

### DAG Validation
Before any connection is accepted, `wouldCreateCycle()` runs a DFS to ensure no circular dependencies. If connecting A→B would create a cycle, the connection is rejected.

---

## 8. Workflow Execution Engine

**File: `src/lib/workflow/dag.ts`**

### Step 1: Resolve Target Nodes
- If running a single node: find all its upstream dependencies
- If running selected nodes: find all their upstream dependencies
- If running full workflow: use all nodes

### Step 2: Topological Sort into Layers
Using Kahn's algorithm:
1. Calculate in-degree for each node
2. Find all nodes with in-degree 0 → these form Layer 0
3. Remove Layer 0, decrement in-degrees
4. Repeat until no nodes remain
5. If nodes remain but none have in-degree 0 → cycle detected (error)

### Step 3: Execute Layers
```
Layer 0: [Upload Image, Upload Video, Text #1, Text #2]  ← all run in parallel
Layer 1: [Crop Image, Extract Frame]                      ← wait for Layer 0, then parallel
Layer 2: [LLM #1]                                         ← waits for its dependencies
Layer 3: [LLM #2]                                         ← waits for both branches
```

Within each layer, `Promise.allSettled()` runs all nodes concurrently.

### Step 4: Input Resolution
For each node, `resolveNodeInputs()`:
1. Copies manual values from node data as defaults
2. Overrides with values from connected edges (upstream node outputs)
3. Special handling for the `images` handle (collects multiple URLs into an array)

### Step 5: Handle Failures
When a node fails during execution:
1. The node is marked `FAILED` in the database with the error message.
2. All downstream dependents are automatically **skipped** — they are never attempted.
3. Independent parallel branches (nodes with no dependency on the failed one) **continue normally**.
4. This ensures partial results are preserved and independent work isn't wasted.

### Step 6: Persist Results & Determine Final Status
After each node completes:
- Success: stores outputs + inputs + duration in `NodeRun`
- Failure: stores error message + inputs + duration in `NodeRun`
- Skipped: stores "Skipped: upstream dependency failed" message

Final `WorkflowRun` status is determined as:
- `SUCCESS` — all nodes completed successfully
- `FAILED` — all nodes failed or were skipped
- `PARTIAL` — some nodes succeeded, some failed/skipped (e.g., one branch worked, another didn't)

---

## 9. Trigger.dev Background Tasks

### Why Trigger.dev?
LLM calls and FFmpeg processing can take seconds to minutes. Running them in a Next.js API route would timeout. Trigger.dev executes these as background jobs with:
- Automatic retries (2 attempts)
- Status tracking
- No timeout limits

### LLM Task (`src/trigger/llm-task.ts`)
1. Creates a `GoogleGenerativeAI` client
2. Builds a `parts` array: system prompt text + user message text + base64-encoded images
3. Calls `model.generateContent(parts)`
4. Returns `{ output: text }`

### Crop Image Task (`src/trigger/crop-image-task.ts`)
1. Downloads the image to a temp directory
2. Runs FFmpeg with crop filter: `crop=iw*widthPct:ih*heightPct:iw*xPct:ih*yPct`
3. Reads the output file and converts to base64 data URL
4. Cleans up temp files

### Extract Frame Task (`src/trigger/extract-frame-task.ts`)
1. Downloads the video to a temp directory
2. If timestamp is a percentage (e.g. "50%"), calculates actual seconds from video duration
3. Runs FFmpeg: `-ss <time> -i input -vframes 1 output.png`
4. Returns base64 data URL of the extracted frame

### How API Routes Trigger Tasks
```typescript
const handle = await tasks.trigger("llm-execute", payload);
for await (const run of runs.subscribeToRun(handle.id)) {
  if (run.status === "COMPLETED") return run.output;
  if (run.status === "FAILED") throw new Error(...);
}
```

---

## 10. State Management

### Workflow Store (`src/store/workflow-store.ts`)
Zustand store that holds the entire React Flow graph state:

| Field | Purpose |
|-------|---------|
| `workflowId` | Current workflow being edited |
| `nodes` | Array of React Flow nodes (with position, data, type) |
| `edges` | Array of React Flow edges (with source/target handles) |
| `viewport` | Current pan/zoom state |
| `selectedNodeIds` | Currently selected nodes |
| `history` / `historyIndex` | Undo/redo stack (max 50 entries) |

**Key actions:**
- `addNode(type, position)` — creates a node with default data
- `onConnect(connection)` — validates connection, replaces existing if same target handle
- `isValidConnection(connection)` — checks data type compatibility + cycle prevention
- `updateNodeData(nodeId, data)` — merges new data into a node (used by all node components)
- `undo()` / `redo()` — restores graph state from history stack

### History Store (`src/store/history-store.ts`)
Tracks execution history for the right sidebar:

| Field | Purpose |
|-------|---------|
| `runs` | Array of `WorkflowRunEntry` objects |
| `selectedRunId` | Which run is expanded in the sidebar |

Each run contains `nodeRuns` with per-node status, inputs, outputs, errors, and duration.

---

## 11. API Routes

### `GET /api/workflows`
Lists all workflows for the authenticated user. Returns: id, name, description, thumbnail, timestamps, run count.

### `POST /api/workflows`
Creates a new empty workflow. Body: `{ name: string }`. Returns the created workflow.

### `GET /api/workflows/[id]`
Fetches a single workflow (auth-scoped). Returns full workflow with flowState.

### `PATCH /api/workflows/[id]`
Updates a workflow. Body: `{ name?, description?, flowState? }`. Used for saving.

### `DELETE /api/workflows/[id]`
Deletes a workflow and all its runs (cascade).

### `GET /api/workflows/[id]/runs`
Fetches the last 50 execution runs with node-level details.

### `POST /api/execute`
**The big one.** Executes a workflow. Body:
```json
{
  "workflowId": "clxyz...",
  "scope": "FULL" | "PARTIAL" | "SINGLE",
  "targetNodeIds": ["node-1", "node-2"]
}
```

Steps:
1. Validates auth + workflow ownership
2. Resolves DAG into execution layers
3. Creates `WorkflowRun` + `NodeRun` records (status: PENDING)
4. Executes each layer sequentially, nodes within layers in parallel
5. Updates `NodeRun` records with results/errors
6. Returns final run status + all node outputs

---

## 12. UI Components

### Workflow Editor (`workflow-editor.tsx`)
The main canvas page. Composes:
- `EditorHeader` — top bar with name, save, history toggle, export/import
- `LeftSidebar` — node palette (always visible as icon rail when collapsed)
- `ReactFlow` canvas — with dot grid, MiniMap, Controls
- `RightSidebar` — execution history panel
- `CanvasToolbar` — bottom bar with undo/redo, zoom, tidy up
- `RunPanel` — floating "Run nodes" button (top-left of canvas)
- `ContextMenu` — right-click menu on nodes

### Left Sidebar
- **Open state**: Full panel with "Quick Access" header, search bar, 6 node buttons
- **Collapsed state**: Thin icon rail with 6 colored node icons (always visible, always clickable)
- Nodes can be **dragged** from either state onto the canvas
- Nodes can be **clicked** to add at a random position

### Right Sidebar
- Shows list of all execution runs (newest first)
- Each entry shows: status badge (color-coded), scope label, timestamp, duration
- Clicking a run expands it to show node-level details:
  - Status icon per node (green check, red X, yellow spinner)
  - Node label + execution time
  - Output preview (truncated to 80 chars)
  - Error message if failed

### Node Shell
Every node is wrapped in `NodeShell` which provides:
- Colored border (based on node type)
- Header with icon, label, and per-node Run button
- **Pulsating glow** during execution (using the node's own color via CSS custom property)
- Selected state ring

---

## 13. Sample Workflow

### "Product Marketing Kit Generator"

This pre-built workflow is seeded on first login. It demonstrates all 6 node types, parallel execution, and convergence.

**Branch A (Image Processing + Product Description):**
1. `Upload Image` — User uploads a product photo
2. `Crop Image` — Crops to 80% center (10% offset on all sides)
3. `Text #1` (System Prompt) — "You are a professional marketing copywriter..."
4. `Text #2` (Product Details) — "Product: Wireless Bluetooth Headphones..."
5. `LLM #1` — Receives: system prompt from Text #1, user message from Text #2, image from Crop Image → Generates product description

**Branch B (Video Frame Extraction):**
6. `Upload Video` — User uploads a product demo video
7. `Extract Frame` — Extracts frame at 50% (middle of video)

**Convergence:**
8. `Text #3` (System Prompt) — "You are a social media manager..."
9. `LLM #2` — Receives: system prompt from Text #3, user message from LLM #1 output, images from both Crop Image + Extract Frame → Generates final marketing tweet

**Execution timeline:**
- Phase 1: Upload Image + Text nodes + Upload Video (all parallel)
- Phase 2: Crop Image + Extract Frame (parallel)
- Phase 3: LLM #1 (waits for crop + texts)
- Phase 4: LLM #2 (waits for BOTH branches)

---

## 14. How to Run Everything

### Step 1: Install
```bash
cd nextflow
npm install
```

### Step 2: Configure Environment
Create `.env.local` with:
- Clerk keys (publishable + secret)
- Google Generative AI key
- Trigger.dev secret key
- Neon PostgreSQL DATABASE_URL
- Transloadit auth key + secret

Create `.env` with just `DATABASE_URL` (for Prisma CLI).

### Step 3: Database Setup
```bash
npx prisma db push      # Creates tables in Neon
npx prisma generate      # Generates Prisma client
npm run db:seed          # Seeds the sample workflow template
```

### Step 4: Run Dev Server
```bash
npm run dev              # Starts Next.js on http://localhost:3000
```

### Step 5: Run Trigger.dev (for executing nodes)
```bash
npx trigger.dev@latest dev
```
This connects your local Trigger.dev tasks to the Trigger.dev cloud for execution.

### Step 6: Use the App
1. Visit `http://localhost:3000` → redirects to sign-in
2. Sign up with Clerk
3. Dashboard shows the sample "Product Marketing Kit Generator" workflow
4. Click it to open the editor
5. Upload an image and video into the respective nodes
6. Click "Run nodes" to execute the full workflow
7. Watch nodes glow as they process
8. Open the History sidebar to see detailed results

---

## Environment Variables Reference

| Variable | Required | Where Used |
|----------|----------|------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk auth (client) |
| `CLERK_SECRET_KEY` | Yes | Clerk auth (server) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini LLM calls |
| `TRIGGER_SECRET_KEY` | Yes | Trigger.dev task execution |
| `DATABASE_URL` | Yes | PostgreSQL connection (Neon) |
| `DATABASE_URL_UNPOOLED` | No | Direct DB connection (migrations) |
| `NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY` | Yes | File uploads (client) |
| `TRANSLOADIT_AUTH_SECRET` | No | File uploads (server-side signing) |

---

## Coding Standards (Following Galaxy.ai + Dub)

- **`withAuth` pattern**: All API routes use a higher-order function that handles auth + errors, keeping route handlers thin (inspired by Dub's `withWorkspace`)
- **Zod validation**: Every API input is validated with Zod schemas before processing
- **Structured errors**: `ApiError` class with error codes, converted to proper HTTP responses
- **Modular organization**: Separate directories for API logic, hooks, stores, components
- **TypeScript strict mode**: No `any` types except where Prisma JSON fields require it
- **Zustand stores**: Clean separation between workflow graph state and execution history
- **React Flow best practices**: Custom node components, proper handle typing, connection validation
