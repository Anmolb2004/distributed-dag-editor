import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

/**
 * Any model id starting with "gemini" is routed to Google Generative AI.
 * Everything else (llama, mixtral, gemma, etc.) is routed to Groq.
 * This mirrors how Krea.ai lets users pick the provider via a single dropdown.
 */
function isGeminiModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith("gemini");
}

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
    const text = isGeminiModel(payload.model)
      ? await runGemini(payload)
      : await runGroq(payload);

    return { output: text };
  },
});

type LlmPayload = {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  imageUrls?: string[];
};

async function runGemini(payload: LlmPayload): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set in the Trigger.dev environment. " +
        "Add it in Trigger.dev dashboard → Project settings → Environment variables (prod)."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: payload.model });

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

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
  return result.response.text();
}

async function runGroq(payload: LlmPayload): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set in the Trigger.dev environment. " +
        "Add it in Trigger.dev dashboard → Project settings → Environment variables (prod)."
    );
  }

  const groq = new Groq({ apiKey });

  // Groq's OpenAI-compatible Chat Completions API.
  // Vision-capable Llama models accept image_url parts; for text-only models
  // we silently drop images rather than fail the run.
  const supportsVision = /llama-?3\.?2.*vision|llava/i.test(payload.model);

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
  if (payload.systemPrompt) {
    messages.push({ role: "system", content: payload.systemPrompt });
  }

  if (supportsVision && payload.imageUrls?.length) {
    const content: Groq.Chat.ChatCompletionContentPart[] = [
      { type: "text", text: payload.userMessage },
      ...payload.imageUrls.map(
        (url) =>
          ({ type: "image_url", image_url: { url } }) as const
      ),
    ];
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: payload.userMessage });
  }

  const completion = await groq.chat.completions.create({
    model: payload.model,
    messages,
  });

  return completion.choices[0]?.message?.content ?? "";
}
