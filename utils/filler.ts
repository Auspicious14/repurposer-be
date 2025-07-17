const fillers = [
  "okay",
  "um",
  "uh",
  "like",
  "you know",
  "so",
  "actually",
  "basically",
  "right",
];

export const stripFillerWords = (text: string): string => {
  const regex = new RegExp(`\\b(${fillers.join("|")})\\b`, "gi");
  return text
    .replace(regex, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};
