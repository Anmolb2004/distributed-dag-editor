import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

/**
 * Product Marketing Kit Generator - Sample Workflow
 *
 * Demonstrates all 6 node types, parallel execution branches,
 * and a convergence point.
 *
 * Branch A: Upload Image → Crop Image → Text (system) + Text (details) → LLM #1
 * Branch B: Upload Video → Extract Frame
 * Convergence: Text (system #2) + LLM #1 output + both images → LLM #2
 */
function buildSampleWorkflow() {
  const nodes = [
    // ── Branch A: Image Processing + Product Description ──
    {
      id: "node-upload-image",
      type: "uploadImage",
      position: { x: 50, y: 100 },
      data: {
        label: "Upload Image",
        nodeType: "uploadImage",
        imageUrl: null,
        fileName: null,
      },
    },
    {
      id: "node-crop-image",
      type: "cropImage",
      position: { x: 350, y: 80 },
      data: {
        label: "Crop Image",
        nodeType: "cropImage",
        imageUrl: null,
        xPercent: 10,
        yPercent: 10,
        widthPercent: 80,
        heightPercent: 80,
        result: null,
        isRunning: false,
      },
    },
    {
      id: "node-system-prompt-1",
      type: "text",
      position: { x: 350, y: 300 },
      data: {
        label: "Text",
        nodeType: "text",
        text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description based on the product image and details provided.",
      },
    },
    {
      id: "node-product-details",
      type: "text",
      position: { x: 350, y: 480 },
      data: {
        label: "Text",
        nodeType: "text",
        text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design, premium leather cushions.",
      },
    },
    {
      id: "node-llm-1",
      type: "llm",
      position: { x: 700, y: 200 },
      data: {
        label: "Run Any LLM",
        nodeType: "llm",
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        images: [],
        result: null,
        isRunning: false,
      },
    },

    // ── Branch B: Video Frame Extraction ──
    {
      id: "node-upload-video",
      type: "uploadVideo",
      position: { x: 50, y: 600 },
      data: {
        label: "Upload Video",
        nodeType: "uploadVideo",
        videoUrl: null,
        fileName: null,
      },
    },
    {
      id: "node-extract-frame",
      type: "extractFrame",
      position: { x: 350, y: 600 },
      data: {
        label: "Extract Frame",
        nodeType: "extractFrame",
        videoUrl: null,
        timestamp: "50%",
        result: null,
        isRunning: false,
      },
    },

    // ── Convergence: Final Marketing Summary ──
    {
      id: "node-system-prompt-2",
      type: "text",
      position: { x: 700, y: 520 },
      data: {
        label: "Text",
        nodeType: "text",
        text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame. Be concise, punchy, and include relevant emojis.",
      },
    },
    {
      id: "node-llm-2",
      type: "llm",
      position: { x: 1050, y: 350 },
      data: {
        label: "Run Any LLM",
        nodeType: "llm",
        model: "gemini-2.5-flash",
        systemPrompt: "",
        userMessage: "",
        images: [],
        result: null,
        isRunning: false,
      },
    },
  ];

  const edges = [
    // Branch A connections
    {
      id: "e-upload-img-crop",
      source: "node-upload-image",
      target: "node-crop-image",
      sourceHandle: "output",
      targetHandle: "image_url",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-system1-llm1",
      source: "node-system-prompt-1",
      target: "node-llm-1",
      sourceHandle: "output",
      targetHandle: "system_prompt",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-details-llm1",
      source: "node-product-details",
      target: "node-llm-1",
      sourceHandle: "output",
      targetHandle: "user_message",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-crop-llm1-images",
      source: "node-crop-image",
      target: "node-llm-1",
      sourceHandle: "output",
      targetHandle: "images",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },

    // Branch B connections
    {
      id: "e-upload-vid-extract",
      source: "node-upload-video",
      target: "node-extract-frame",
      sourceHandle: "output",
      targetHandle: "video_url",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },

    // Convergence connections
    {
      id: "e-system2-llm2",
      source: "node-system-prompt-2",
      target: "node-llm-2",
      sourceHandle: "output",
      targetHandle: "system_prompt",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-llm1-llm2",
      source: "node-llm-1",
      target: "node-llm-2",
      sourceHandle: "output",
      targetHandle: "user_message",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-crop-llm2-images",
      source: "node-crop-image",
      target: "node-llm-2",
      sourceHandle: "output",
      targetHandle: "images",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
    {
      id: "e-extract-llm2-images",
      source: "node-extract-frame",
      target: "node-llm-2",
      sourceHandle: "output",
      targetHandle: "images",
      animated: true,
      style: { stroke: "#A855F7", strokeWidth: 2 },
    },
  ];

  const viewport = { x: 50, y: 50, zoom: 0.85 };

  return { nodes, edges, viewport };
}

export const SAMPLE_WORKFLOW_NAME = "Product Marketing Kit Generator";
export const SAMPLE_WORKFLOW_DESCRIPTION =
  "Demonstrates all 6 node types with parallel execution branches and a convergence point. Upload a product image and demo video to generate marketing copy.";

export function getSampleFlowState() {
  return buildSampleWorkflow();
}

async function main() {
  console.log("🌱 Seeding database...");

  // The seed creates a "template" workflow with a placeholder clerkUserId.
  // The dashboard auto-clones it for new users on first login.
  const existing = await db.workflow.findFirst({
    where: { name: SAMPLE_WORKFLOW_NAME, clerkUserId: "SEED_TEMPLATE" },
  });

  if (!existing) {
    await db.workflow.create({
      data: {
        clerkUserId: "SEED_TEMPLATE",
        name: SAMPLE_WORKFLOW_NAME,
        description: SAMPLE_WORKFLOW_DESCRIPTION,
        flowState: buildSampleWorkflow(),
      },
    });
    console.log("✅ Sample workflow template created");
  } else {
    console.log("⏭️  Sample workflow template already exists");
  }

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
