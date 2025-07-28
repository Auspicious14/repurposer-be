// Platform-specific formatting (fast)
export function applyPlatformFormatting(
  content: string,
  platform: string
): string {
  switch (platform.toLowerCase()) {
    case "twitter":
      // Ensure reasonable length
      if (content.length > 280) {
        const truncated = content.substring(0, 270).trim();
        return truncated + "... 🧵";
      }
      // Add hashtags if none exist
      if (!content.includes("#") && content.length < 250) {
        const hashtags = ["#Content", "#Marketing", "#Business"];
        const randomHashtag =
          hashtags[Math.floor(Math.random() * hashtags.length)];
        return content + " " + randomHashtag;
      }
      return content;

    case "instagram":
      // Add line breaks for readability
      return content
        .replace(/\. /g, ".\n\n")
        .replace(/! /g, "!\n\n")
        .replace(/\? /g, "?\n\n");

    case "linkedin":
      // Professional formatting with better spacing
      return (
        content.replace(/\n/g, "\n\n") +
        // Add professional closing if missing
        (!content.includes("Best regards") && !content.includes("Sincerely")
          ? "\n\nBest regards"
          : "")
      );

    case "email":
      // Add subject line if missing
      if (!content.toLowerCase().includes("subject:")) {
        const firstLine = content.split("\n")[0];
        const subject =
          firstLine.length > 50
            ? firstLine.substring(0, 47) + "..."
            : firstLine.replace(/[^\w\s]/gi, "").trim();
        return `Subject: ${subject}\n\n${content}`;
      }
      return content;

    case "blog":
      // Add basic structure
      const lines = content.split("\n");
      if (lines.length < 3) {
        return content; // Too short for blog formatting
      }

      // Make first line a headline if it's not already
      const firstLine = lines[0];
      if (!firstLine.startsWith("#") && firstLine.length < 100) {
        lines[0] = `# ${firstLine}`;
      }

      return lines.join("\n");

    case "facebook":
      // Encourage engagement
      if (!content.includes("?") && !content.includes("What do you think")) {
        return (
          content + "\n\nWhat do you think? Let me know in the comments! 👇"
        );
      }
      return content;

    case "tiktok":
      // Keep it short and punchy
      if (content.length > 150) {
        return content.substring(0, 147) + "...";
      }
      // Add trending elements
      return content.replace(/\.$/, " ✨");

    default:
      return content;
  }
}
