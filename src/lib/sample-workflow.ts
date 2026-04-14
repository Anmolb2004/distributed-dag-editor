/**
 * Inline sample workflow definition for first-login auto-seed
 * when the Prisma seed template doesn't exist.
 */
export function getSampleFlowState() {
  const nodes = [
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
    { id: "e-upload-img-crop", source: "node-upload-image", target: "node-crop-image", sourceHandle: "output", targetHandle: "image_url", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-system1-llm1", source: "node-system-prompt-1", target: "node-llm-1", sourceHandle: "output", targetHandle: "system_prompt", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-details-llm1", source: "node-product-details", target: "node-llm-1", sourceHandle: "output", targetHandle: "user_message", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-crop-llm1-images", source: "node-crop-image", target: "node-llm-1", sourceHandle: "output", targetHandle: "images", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-upload-vid-extract", source: "node-upload-video", target: "node-extract-frame", sourceHandle: "output", targetHandle: "video_url", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-system2-llm2", source: "node-system-prompt-2", target: "node-llm-2", sourceHandle: "output", targetHandle: "system_prompt", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-llm1-llm2", source: "node-llm-1", target: "node-llm-2", sourceHandle: "output", targetHandle: "user_message", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-crop-llm2-images", source: "node-crop-image", target: "node-llm-2", sourceHandle: "output", targetHandle: "images", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
    { id: "e-extract-llm2-images", source: "node-extract-frame", target: "node-llm-2", sourceHandle: "output", targetHandle: "images", animated: true, style: { stroke: "#A855F7", strokeWidth: 2 } },
  ];

  return { nodes, edges, viewport: { x: 50, y: 50, zoom: 0.85 } };
}
