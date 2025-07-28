export function applyToneTransformation(content: string, tone: string): string {
  switch (tone.toLowerCase()) {
    case "casual":
      return (
        content
          // Make contractions
          .replace(/\b(do not|does not)\b/gi, "don't")
          .replace(/\b(will not)\b/gi, "won't")
          .replace(/\b(cannot)\b/gi, "can't")
          .replace(/\b(you are)\b/gi, "you're")
          .replace(/\b(I am)\b/gi, "I'm")
          .replace(/\b(we are)\b/gi, "we're")
          // Add casual words
          .replace(/\bHello\b/gi, "Hey")
          .replace(/\bGreetings\b/gi, "Hi there")
          // More relaxed punctuation
          .replace(/\./g, (match, offset, string) => {
            // Don't change periods in URLs or email addresses
            if (
              string.substring(offset - 10, offset + 10).includes("@") ||
              string.substring(offset - 10, offset + 10).includes("http")
            ) {
              return match;
            }
            return Math.random() > 0.7 ? "!" : ".";
          })
      );

    case "professional":
      return (
        content
          // Expand contractions
          .replace(/\bdon't\b/gi, "do not")
          .replace(/\bwon't\b/gi, "will not")
          .replace(/\bcan't\b/gi, "cannot")
          .replace(/\byou're\b/gi, "you are")
          .replace(/\bI'm\b/gi, "I am")
          .replace(/\bwe're\b/gi, "we are")
          // Professional greetings
          .replace(/\bHey\b/gi, "Hello")
          .replace(/\bHi\b/gi, "Good day")
          // Remove excessive exclamation marks
          .replace(/!+/g, ".")
      );

    case "friendly":
      return (
        content
          // Add friendly words
          .replace(/\bHello\b/gi, "Hello there")
          .replace(/\bHi\b/gi, "Hi friend")
          .replace(/\bThanks\b/gi, "Thanks so much")
          .replace(/\bThank you\b/gi, "Thank you so much")
          // Add exclamation points sparingly
          .replace(/\.$/, "!")
          // Add friendly closings
          .replace(/\bBest regards\b/gi, "Best wishes")
          .replace(/\bSincerely\b/gi, "Warmly")
      );

    case "formal":
      return (
        content
          // Formal language
          .replace(/\bget\b/gi, "obtain")
          .replace(/\bshow\b/gi, "demonstrate")
          .replace(/\btell\b/gi, "inform")
          .replace(/\bhelp\b/gi, "assist")
          .replace(/\bbuy\b/gi, "purchase")
          // Formal greetings
          .replace(/\bHey\b/gi, "Dear")
          .replace(/\bHi\b/gi, "Dear")
          // Remove casual punctuation
          .replace(/!+/g, ".")
          .replace(/\?!/g, "?")
      );

    case "humorous":
      // Add light humor without being inappropriate
      const funnyReplacements = [
        { from: /\bawesome\b/gi, to: "absolutely fantastic" },
        { from: /\bgreat\b/gi, to: "amazing" },
        { from: /\bgood\b/gi, to: "pretty sweet" },
        { from: /\bfast\b/gi, to: "lightning-fast" },
        { from: /\beasy\b/gi, to: "piece of cake" },
      ];

      let humorousContent = content;
      funnyReplacements.forEach(({ from, to }) => {
        if (Math.random() > 0.6) {
          // Only apply sometimes
          humorousContent = humorousContent.replace(from, to);
        }
      });

      // Add occasional emoji if none exist
      if (
        !/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/u.test(
          humorousContent
        )
      ) {
        const emojis = ["😄", "😊", "🎉", "✨", "🚀"];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        humorousContent = humorousContent.replace(/\.$/, ` ${randomEmoji}.`);
      }

      return humorousContent;

    case "persuasive":
      return (
        content
          // Add urgency
          .replace(/\btoday\b/gi, "today only")
          .replace(/\bavailable\b/gi, "available now")
          .replace(/\bfree\b/gi, "absolutely free")
          // Stronger action words
          .replace(/\bget\b/gi, "grab")
          .replace(/\btry\b/gi, "experience")
          .replace(/\bclick\b/gi, "tap now")
          // Add power words
          .replace(/\bgood\b/gi, "incredible")
          .replace(/\bnice\b/gi, "amazing")
          .replace(/\bhelp\b/gi, "transform")
      );

    case "informative":
      return (
        content
          // Add clarity words
          .replace(/\bthing\b/gi, "element")
          .replace(/\bstuff\b/gi, "information")
          .replace(/\ba lot\b/gi, "numerous")
          // More specific language
          .replace(/\bsome\b/gi, "several")
          .replace(/\bmany\b/gi, "multiple")
          .replace(/\bbig\b/gi, "significant")
      );

    default:
      return content;
  }
}
