interface BuildPromptOptions {
  input: string;
  title?: string;
  tone?: string;
  keywords?: string[];
  platforms: string[];
}

// export const buildPrompt = ({
//   input,
//   platforms,
//   title,
//   tone = "Informative",
//   keywords = [],
// }: BuildPromptOptions): string => {
//   const [platform] = platforms;
//   return `
// You are a smart content repurposing assistant. Your sole task is to generate engaging content tailored exclusively for ${platform}. Ignore all other platforms and focus only on ${platform}'s requirements.

// ## Input
// - Title: ${title || "Not provided"}
// - Main Content: """${input}"""
// - Tone: ${tone}
// - Target Platform: ${platform} (Generate content only for this platform)
// - Keywords (Optional): ${keywords.length ? keywords.join(", ") : "None"}

// ## Output Requirements:
// Produce a single, cohesive piece of content optimized for ${platform}. Include a 'Title:' line, a 'Keywords:' line with comma-separated keywords, and the main content below. Follow only the guideline for ${platform} below. Do not mention or generate content for other platforms.

// ## Platform Guideline:
// - *${platform}*:
//   ${
//     platform === "Twitter/X (Thread)" &&
//     `
//     - Start with a compelling hook (1 tweet).
//     - Follow with 2-5 concise, value-driven tweets (max 280 characters each).
//     - End with a question or CTA (1 tweet).
//     - Format as numbered tweets (e.g., 1/3, 2/3).`
//   }
//   ${
//     platform === "LinkedIn" &&
//     `
//     - Write in a professional, human tone.
//     - Use short paragraphs with whitespace for readability.
//     - Highlight 2-3 key takeaways or industry insights.`
//   }
//   ${
//     platform === "Instagram Caption" &&
//     `
//     - Use a warm, personal tone.
//     - Start with an attention-grabbing line.
//     - Include 1-2 emojis and 3-5 relevant hashtags.
//     - End with a CTA to comment or share.`
//   }
//   ${
//     platform === "YouTube Description" &&
//     `
//     - Provide a clear 1-2 sentence summary.
//     - Include a 'Timestamps:' section with 3-5 key points.
//     - Add a 'CTA:' line with a subscribe prompt and keywords.`
//   }
//   ${
//     platform === "Blog Summary" &&
//     `
//     - Write a 50-70 word summary of the input.
//     - Include 1-2 suggested headings in bold.
//     - Keep it SEO-friendly with keywords.`
//   }

// ## Rules:
// - Generate content only for ${platform}. Any reference to other platforms will invalidate the response.
// - Keep it human, natural, and compelling—avoid generic filler.
// - Ensure the output fits ${platform}'s format and tone.
// - Include 'Title:' and 'Keywords:' as the first two lines, followed by the content.

// Now generate the repurposed content.`.trim();
// };

export const buildPrompt = ({
  input,
  platforms,
  title,
  tone = "Informative",
  keywords = [],
}: BuildPromptOptions): string => {
  const [platform] = platforms;
  return `
You are a smart content repurposing assistant. Your sole task is to generate engaging content tailored exclusively for ${platform}. Ignore all other platforms and focus only on ${platform}'s requirements.

## Input
- Title: ${title || "Not provided"}
- Main Content: """${input}"""
- Tone: ${tone}
- Target Platform: ${platform} (Generate content only for this platform)
- Keywords (Optional): ${keywords.length ? keywords.join(", ") : "None"}

## Output Requirements:
Produce a single, cohesive piece of content optimized for ${platform}. Include a 'Title:' line, a 'Keywords:' line with comma-separated keywords, and the main content below. Follow only the guideline for ${platform} below. Do not add details not present in the input (e.g., word counts or visuals unless specified).

## Platform Guideline:
- *${platform}*:
  ${
    platform === "Twitter/X (Thread)" &&
    `
    - Start with a compelling hook (1 tweet, max 280 characters).
    - Follow with 2-5 concise, value-driven tweets (max 280 characters each).
    - End with a question or CTA (1 tweet, max 280 characters).
    - Format each tweet with a number (e.g., 1/4, 2/4) and ensure each fits Twitter's 280-character limit.`
  }
  ${
    platform === "LinkedIn" &&
    `
    - Write in a ${tone.toLowerCase()} yet human tone.
    - Use short paragraphs with whitespace for readability.
    - Highlight 2-3 key takeaways or industry insights based solely on the input.`
  }
  ${
    platform === "Instagram Caption" &&
    `
    - Use a warm, ${tone.toLowerCase()} tone.
    - Start with an attention-grabbing line.
    - Include 1-2 emojis and 3-5 relevant hashtags.
    - End with a CTA to comment or share.`
  }
  ${
    platform === "YouTube Description" &&
    `
    - Provide a clear 1-2 sentence summary.
    - Include a 'Timestamps:' section with 3-5 key points.
    - Add a 'CTA:' line with a subscribe prompt and keywords.`
  }
  ${
    platform === "Blog Summary" &&
    `
    - Write a 50-70 word summary of the input.
    - Include 1-2 suggested headings in bold.
    - Keep it SEO-friendly with keywords.`
  }

## Rules:
- Generate content only for ${platform}. Any reference to other platforms will invalidate the response.
- Base content strictly on the input—do not invent details (e.g., word counts, visuals).
- Keep it human, natural, and compelling—avoid generic filler.
- Ensure the output fits ${platform}'s format and ${tone} tone.
- Include 'Title:' and 'Keywords:' as the first two lines, followed by the content.

Now generate the repurposed content.`.trim();
};
