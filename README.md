# NextFlow - Visual LLM Workflow Builder

A pixel-perfect clone of Krea.ai's workflow builder, specialized for LLM workflows. Built with Next.js, React Flow, Google Gemini, and Trigger.dev.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS 4 + custom dark theme |
| Auth | Clerk |
| Database | PostgreSQL (Neon) + Prisma 7 |
| Workflow Canvas | React Flow v12 |
| State Management | Zustand |
| Background Tasks | Trigger.dev v4 |
| LLM | Google Gemini API |
| File Uploads | Transloadit |
| Media Processing | FFmpeg (via Trigger.dev) |
| Validation | Zod v4 |
| Icons | Lucide React |

## Features

- **6 Node Types**: Text, Upload Image, Upload Video, Run Any LLM, Crop Image, Extract Frame from Video
- **Visual Workflow Canvas**: Drag & drop nodes, animated purple edge connections, dot grid background, MiniMap
- **LLM Integration**: Google Gemini with vision support (multimodal prompts with images)
- **Parallel Execution**: Independent DAG branches execute concurrently
- **Selective Execution**: Run full workflow, selected nodes, or a single node
- **Type-Safe Connections**: Image nodes can't connect to text inputs; invalid connections are visually disallowed
- **Connected Input State**: When a handle has a connection, the manual input field is disabled/greyed out
- **DAG Validation**: Circular loops/cycles are prevented
- **Failure Handling**: Failed nodes skip their downstream dependents; independent branches continue
- **Execution History**: Right sidebar with timestamped runs, expandable node-level details (inputs, outputs, errors, duration)
- **Workflow Persistence**: Save/load workflows to PostgreSQL
- **Export/Import**: Download and upload workflow JSON files
- **Auto-Save**: Workflows save automatically 5 seconds after changes
- **Undo/Redo**: Full history support for node operations
- **Pulsating Glow**: Nodes glow with their own color during execution
- **Right-Click Menu**: Context menu with Run, Duplicate, Delete, Fit View
- **Pre-built Sample Workflow**: "Product Marketing Kit Generator" seeded on first login
- **Keyboard Shortcuts**: Cmd+S (save), Cmd+Z/Shift+Cmd+Z (undo/redo), N (add node), Delete/Backspace (delete)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Accounts on: [Clerk](https://clerk.com), [Google AI Studio](https://aistudio.google.com), [Trigger.dev](https://trigger.dev), [Transloadit](https://transloadit.com), [Neon](https://neon.tech)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google Generative AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_...

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# Transloadit
NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY=your_key_here
TRANSLOADIT_AUTH_SECRET=your_secret_here
```

Create `.env` for Prisma CLI:

```env
DATABASE_URL=postgresql://...
```

### 3. Set Up Database

```bash
npx prisma db push
npx prisma generate
```

### 4. Seed Sample Workflow

```bash
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Start Trigger.dev (for task execution)

```bash
npx trigger.dev@latest dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (workflows, execute, runs)
│   ├── dashboard/          # Dashboard page
│   ├── sign-in/            # Clerk sign-in
│   ├── sign-up/            # Clerk sign-up
│   └── workflow/[id]/      # Workflow editor page
├── components/
│   ├── dashboard/          # Dashboard client component
│   ├── editor/             # Canvas toolbar, header, sidebars, run panel, context menu
│   └── nodes/              # 6 custom node components + NodeShell wrapper
├── lib/
│   ├── api/                # withAuth HOC, error handling (Dub-inspired)
│   ├── hooks/              # useExecution hook, ExecutionContext
│   ├── workflow/           # DAG resolver with parallel layer execution
│   └── zod/schemas/        # Zod validation schemas
├── store/                  # Zustand stores (workflow, history)
├── trigger/                # Trigger.dev task definitions (LLM, crop, extract)
└── types/                  # TypeScript types and node definitions
prisma/
├── schema.prisma           # Database schema (Workflow, WorkflowRun, NodeRun)
└── seed.ts                 # Sample workflow seed script
```

## Sample Workflow: Product Marketing Kit Generator

The seeded workflow demonstrates all features:

- **Branch A**: Upload Image → Crop Image → LLM #1 (generates product description)
- **Branch B**: Upload Video → Extract Frame (mid-video screenshot)
- **Convergence**: LLM #2 (combines both branches into a marketing tweet)

Branches A and B execute in parallel. LLM #2 waits for both to complete.

## Failure Handling & DAG Resolution

The execution engine resolves the workflow into parallel layers using topological sort (Kahn's algorithm). Each layer contains nodes that can run concurrently because all their dependencies have been satisfied.

**When a node fails:**
1. The failed node is marked `FAILED` with its error message stored in the database.
2. All downstream dependents of the failed node are automatically **skipped** — they never attempt execution.
3. Independent parallel branches (nodes with no dependency on the failed node) **continue executing normally**.
4. The overall workflow run is marked `PARTIAL` if some nodes succeeded and some failed/were skipped.
5. If all nodes failed, the run is `FAILED`. If all succeeded, it's `SUCCESS`.

**Example:** If Branch A's Crop Image node fails but Branch B's Extract Frame is independent, Branch B finishes successfully. The convergence LLM #2 is skipped because it depends on both branches. The run status is `PARTIAL`.

## Technical Decisions & Architecture

### PostgreSQL + Prisma over MongoDB
The assignment's general tools table listed MongoDB, but the detailed technical specifications explicitly required PostgreSQL with Prisma and Neon. Beyond the spec, relational tables are the right choice here: workflow runs contain granular per-node execution records (inputs, outputs, duration, status) with strict foreign key relationships (`Workflow → WorkflowRun → NodeRun`). This relational structure is far superior to document-based storage for querying execution history, aggregating run statistics, and ensuring referential integrity when deleting workflows.

### Transloadit for File Uploads
The assignment's node specifications explicitly require Transloadit for file uploads. The general tools table listed Uploadcare, but the detailed per-node requirements override the general guidance. Transloadit provides assembly-based processing with built-in polling for completion status, which integrates cleanly with our upload flow.

### Trigger.dev for All Node Execution
The assignment mandates: "Every node execution MUST be a Trigger.dev task. This is non-negotiable." LLM calls to Gemini and FFmpeg processing (crop image, extract frame) are CPU/time-intensive operations that would timeout in a serverless API route. Trigger.dev provides background execution with automatic retries, status tracking, and no timeout limits.

### `withAuth` Higher-Order Function (Dub Pattern)
Following the Dub codebase's `withWorkspace` pattern, all API routes are wrapped with a `withAuth` HOC that handles Clerk authentication and centralized error handling. This keeps route handlers thin and focused purely on business logic — a pattern that scales well as the API surface grows.

### Zustand over Redux/Context
Zustand provides a minimal, hook-based store API without the boilerplate of Redux or the re-render issues of React Context for frequent state updates. Two stores cleanly separate concerns: `workflow-store` (graph state, undo/redo) and `history-store` (execution runs).

### DAG Topological Sort for Execution Order
Rather than a simple sequential execution, the engine resolves the workflow graph into parallel layers using Kahn's algorithm. This satisfies the assignment's requirement that "independent branches must execute concurrently" while ensuring nodes only run after all their upstream dependencies complete.

## Tradeoffs & Future Improvements

Due to scope constraints, the following optimizations were deferred:

- **Input-hash caching for LLM nodes**: Currently, re-running a workflow always re-executes all nodes. A production system would hash node inputs and skip re-execution if inputs haven't changed since the last successful run.
- **Rate limiting**: The execution API has no rate limiting. A production deployment would add per-user rate limits to prevent abuse of the Gemini API quota.
- **Streaming LLM responses**: Currently, LLM output is returned only after full completion. Streaming the Gemini response token-by-token would provide much better UX for long generations.
- **Distributed queue workers**: Trigger.dev handles background execution, but for high-throughput production use, dedicated queue workers with priority scheduling would improve reliability.
- **Optimistic UI for execution**: The UI updates after the API responds. True real-time updates via WebSocket or Server-Sent Events would show per-node progress as it happens.
- **Workflow versioning**: Currently, saving overwrites the workflow. A version history with diff comparison would allow users to roll back changes.
- **Collaborative editing**: Multiple users editing the same workflow simultaneously, using CRDTs or operational transforms.

## Scripts

| Command | Description |
|---------|------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample workflow |
| `npm run db:generate` | Generate Prisma client |

## Deployment

See the [Deployment Guide](#deployment-to-vercel) below.

### Deployment to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the project
3. Set the root directory to `nextflow` (if the repo root is the parent folder)
4. Add all environment variables from `.env.local` in Vercel's project settings
5. Deploy — Vercel auto-detects Next.js and handles the build

## Architecture Notes

- **API Routes**: Follow Dub's `withAuth` higher-order function pattern for auth + error handling
- **Execution Engine**: Topological sort resolves DAG into parallel layers; each layer runs concurrently
- **Trigger.dev Tasks**: All node executions (LLM, FFmpeg) run as background tasks via Trigger.dev
- **State Management**: Zustand for React Flow graph state + execution history
- **Type Safety**: Zod validation on all API inputs; TypeScript strict mode throughout
