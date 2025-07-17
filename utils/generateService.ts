import { OpenAI } from "openai";
import axios from "axios";
import { stripFillerWords } from "../utils/filler";
import { buildPrompt } from "./buildPrompt";
import dotenv from "dotenv";
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY || "",
});

export async function generateWithOpenAI(
  transcript: string,
  format: string,
  tone: string
): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  keywords?: string[];
  source?: string;
  error?: any;
}> {
  const prompt = buildPrompt({
    input: transcript,
    platforms: [format],
    tone,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0].message.content ?? "";

    // Use regex to extract title and keywords from the response
    const titleMatch = raw.match(/Title:\s*(.+)/i);
    const keywordsMatch = raw.match(/Keywords:\s*(.+)/i);

    const title = titleMatch?.[1]?.trim() ?? "";
    const keywords = keywordsMatch?.[1]?.split(",").map((k) => k.trim()) ?? [];

    // Remove metadata from final content
    const cleanedContent = raw
      .replace(/Title:.+/, "")
      .replace(/Keywords:.+/, "")
      .trim();

    return {
      success: true,
      content: cleanedContent,
      title,
      keywords,
      source: "openrouter",
    };
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return { success: false, error: err.message || "Unknown OpenAI error" };
  }
}

// POLLINATIONS FALLBACK
export async function fallbackWithPollinations(
  transcript: string,
  format: string,
  tone: string
): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  keywords?: string[];
  source?: string;
  error?: any;
}> {
  const prompt = buildPrompt({
    input: transcript,
    platforms: [format],
    tone,
  });

  try {
    const { data } = await axios.post("https://api.pollinations.ai/text", {
      prompt,
    });

    const raw = data.result;

    const titleMatch = raw.match(/Title:\s*(.+)/i);
    const keywordsMatch = raw.match(/Keywords:\s*(.+)/i);

    const title = titleMatch?.[1]?.trim() ?? "";
    const keywords = keywordsMatch?.[1]?.split(",").map((k) => k.trim()) ?? [];

    const cleanedContent = raw
      .replace(/Title:.+/, "")
      .replace(/Keywords:.+/, "")
      .trim();

    return {
      success: true,
      content: cleanedContent,
      title,
      keywords,
      source: "pollinations",
    };
  } catch (err: any) {
    console.error("Pollinations error:", err);
    return {
      success: false,
      error: err.message || "Unknown Pollinations error",
    };
  }
}

export const generateContent = async (
  transcript: string,
  format: string,
  tone: string
): Promise<{
  content: string;
  title: string;
  keywords: string[];
  source: string;
}> => {
  const cleaned = stripFillerWords(transcript);

  const result = await generateWithOpenAI(cleaned, format, tone);
  if (result.success) {
    return {
      content: result.content!,
      title: result.title ?? "",
      keywords: result.keywords ?? [],
      source: "openai",
    };
  }

  const fallback = await fallbackWithPollinations(cleaned, format, tone);
  if (fallback.success) {
    return {
      content: fallback.content!,
      title: fallback.title ?? "",
      keywords: fallback.keywords ?? [],
      source: "pollinations",
    };
  }

  throw new Error("Both OpenAI and Pollinations failed");
};
