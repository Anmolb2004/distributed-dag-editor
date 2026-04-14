import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const llmTask = schemaTask({
  id: "llm-execute",
  schema: z.object({
    model: z.string().default("gemini-2.5-flash"),
    systemPrompt: z.string().optional(),
    userMessage: z.string(),
    imageUrls: z.array(z.string()).optional(),
  }),
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: payload.model });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (payload.systemPrompt) {
      parts.push({ text: `System: ${payload.systemPrompt}\n\n` });
    }

    parts.push({ text: payload.userMessage });

    if (payload.imageUrls?.length) {
      for (const url of payload.imageUrls) {
        try {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          parts.push({ inlineData: { mimeType, data: base64 } });
        } catch (err) {
          console.warn(`Failed to fetch image ${url}:`, err);
        }
      }
    }

    const result = await model.generateContent(parts);
    const text = result.response.text();

    return { output: text };
  },
});
