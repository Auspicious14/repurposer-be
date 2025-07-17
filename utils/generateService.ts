import { OpenAI } from "openai";
import axios from "axios";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export async function generateWithOpenAI(
  transcript: string,
  format: string,
  tone: string
) {
  try {
    const prompt = `Repurpose the following transcript into a ${format}. Use a ${tone} tone:\n\n${transcript}`;

    const response = await openai.chat.completions.create({
      model: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
      messages: [{ role: "user", content: prompt }],
    });

    return {
      success: true,
      content: response.choices[0].message.content,
      source: "openrouter",
    };
  } catch (err) {
    console.error("OpenAI error:", err);
    return { success: false, error: err };
  }
}

export async function fallbackWithPollinations(
  transcript: string,
  format: string,
  tone: string
) {
  try {
    const prompt = `Turn this into a ${format} in a ${tone} tone: ${transcript}`;

    const { data } = await axios.post("https://api.pollinations.ai/text", {
      prompt,
    });

    return {
      success: true,
      content: data.result,
      source: "pollinations",
    };
  } catch (err) {
    console.error("Pollinations error:", err);
    return { success: false, error: err };
  }
}
