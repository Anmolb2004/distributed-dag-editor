export const NODE_TYPES = {
  TEXT: "text",
  UPLOAD_IMAGE: "uploadImage",
  UPLOAD_VIDEO: "uploadVideo",
  LLM: "llm",
  CROP_IMAGE: "cropImage",
  EXTRACT_FRAME: "extractFrame",
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const HANDLE_DATA_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  NUMBER: "number",
} as const;

export type HandleDataType = (typeof HANDLE_DATA_TYPES)[keyof typeof HANDLE_DATA_TYPES];

export interface NodeHandle {
  id: string;
  label: string;
  dataType: HandleDataType;
  required?: boolean;
}

export interface NodeDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: NodeHandle[];
  outputs: NodeHandle[];
}

export const NODE_DEFINITIONS: Record<NodeType, NodeDefinition> = {
  [NODE_TYPES.TEXT]: {
    type: NODE_TYPES.TEXT,
    label: "Text",
    description: "Simple text input with textarea",
    icon: "Type",
    color: "#EAB308",
    inputs: [],
    outputs: [{ id: "output", label: "Output", dataType: "text" }],
  },
  [NODE_TYPES.UPLOAD_IMAGE]: {
    type: NODE_TYPES.UPLOAD_IMAGE,
    label: "Upload Image",
    description: "Upload an image file",
    icon: "ImagePlus",
    color: "#3B82F6",
    inputs: [],
    outputs: [{ id: "output", label: "Image", dataType: "image" }],
  },
  [NODE_TYPES.UPLOAD_VIDEO]: {
    type: NODE_TYPES.UPLOAD_VIDEO,
    label: "Upload Video",
    description: "Upload a video file",
    icon: "Video",
    color: "#8B5CF6",
    inputs: [],
    outputs: [{ id: "output", label: "Video", dataType: "video" }],
  },
  [NODE_TYPES.LLM]: {
    type: NODE_TYPES.LLM,
    label: "Run Any LLM",
    description: "Execute LLM with prompts and images",
    icon: "Brain",
    color: "#10B981",
    inputs: [
      { id: "system_prompt", label: "System Prompt", dataType: "text" },
      { id: "user_message", label: "User Message", dataType: "text", required: true },
      { id: "images", label: "Images", dataType: "image" },
    ],
    outputs: [{ id: "output", label: "Output", dataType: "text" }],
  },
  [NODE_TYPES.CROP_IMAGE]: {
    type: NODE_TYPES.CROP_IMAGE,
    label: "Crop Image",
    description: "Crop an image with configurable parameters",
    icon: "Crop",
    color: "#F97316",
    inputs: [
      { id: "image_url", label: "Image URL", dataType: "image", required: true },
      { id: "x_percent", label: "X %", dataType: "number" },
      { id: "y_percent", label: "Y %", dataType: "number" },
      { id: "width_percent", label: "Width %", dataType: "number" },
      { id: "height_percent", label: "Height %", dataType: "number" },
    ],
    outputs: [{ id: "output", label: "Output", dataType: "image" }],
  },
  [NODE_TYPES.EXTRACT_FRAME]: {
    type: NODE_TYPES.EXTRACT_FRAME,
    label: "Extract Frame",
    description: "Extract a frame from a video",
    icon: "Film",
    color: "#EC4899",
    inputs: [
      { id: "video_url", label: "Video URL", dataType: "video", required: true },
      { id: "timestamp", label: "Timestamp", dataType: "text" },
    ],
    outputs: [{ id: "output", label: "Output", dataType: "image" }],
  },
};

/** Which data types are compatible for connections */
export const CONNECTION_RULES: Record<HandleDataType, HandleDataType[]> = {
  text: ["text"],
  image: ["image"],
  video: ["video"],
  number: ["number", "text"],
};
