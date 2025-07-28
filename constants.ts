import { TonePrompts } from "./types";

export const ALLOWED_TONES = [
  "Friendly",
  "Professional",
  "Humorous",
  "Urgent",
  "Witty",
  "Casual",
  "Informative",
];
export const SUPPORTED_PLATFORMS = [
  "Twitter",
  "X",
  "LinkedIn",
  "Thread",
  "Instagram Caption",
  "Tiktok",
  "Whatsapp",
  "Blog Summary",
  "Youtube Description",
];

export const TONE_PROMPTS: TonePrompts = {
  casual: {
    systemPrompt:
      "You are a friendly, casual content writer. Make content feel conversational and approachable.",
    instructions:
      "Make this more casual and friendly. Use contractions, casual language, and a conversational tone. Keep the same meaning but make it feel like talking to a friend.",
  },
  professional: {
    systemPrompt:
      "You are a professional business writer. Make content clear, credible, and polished.",
    instructions:
      "Make this more professional and polished. Use proper grammar, formal language, and a business-appropriate tone. Maintain clarity and credibility.",
  },
  friendly: {
    systemPrompt:
      "You are an enthusiastic, warm content writer. Make content feel welcoming and positive.",
    instructions:
      "Make this more friendly and welcoming. Add warmth, enthusiasm, and positive energy. Use inclusive language and make the reader feel valued.",
  },
  formal: {
    systemPrompt:
      "You are a formal business writer. Make content sophisticated and official.",
    instructions:
      "Make this more formal and sophisticated. Use proper business language, avoid contractions, and maintain a serious, official tone.",
  },
  humorous: {
    systemPrompt:
      "You are a witty content writer. Add appropriate humor while maintaining the message.",
    instructions:
      "Add appropriate humor and wit to this content. Use clever wordplay, light jokes, or amusing observations while keeping the core message intact.",
  },
  persuasive: {
    systemPrompt:
      "You are a persuasive copywriter. Make content compelling and action-oriented.",
    instructions:
      "Make this more persuasive and compelling. Add urgency, social proof, benefits, and strong calls-to-action. Focus on motivating the reader to take action.",
  },
  informative: {
    systemPrompt:
      "You are an educational content writer. Make content clear, helpful, and informative.",
    instructions:
      "Make this more informative and educational. Add helpful details, clarify concepts, and structure information clearly for easy understanding.",
  },
};

export const PLATFORM_GUIDELINES: Record<string, string> = {
  twitter:
    "Keep it concise (under 280 chars if possible). Use emojis, hashtags, and mentions appropriately. Make it engaging for social media.",
  linkedin:
    "Professional tone suitable for business networking. Can be longer and more detailed. Focus on value and insights.",
  instagram:
    "Visual-first platform. Use emojis, line breaks for readability, and engaging captions. Include relevant hashtags.",
  email:
    "Subject line + body format. Professional but personal. Clear structure with greeting and sign-off.",
  blog: "Longer form content. Use headlines, subheadings, and proper structure. SEO-friendly and informative.",
  facebook:
    "Conversational and engaging. Good for community building. Can include questions to drive engagement.",
  tiktok:
    "Short, punchy, trend-aware. Use popular phrases and hooks. Focus on engagement and virality.",
};
