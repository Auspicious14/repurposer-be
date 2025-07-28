import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY || "",
});
