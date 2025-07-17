import { Request, Response } from "express";
import {
  generateWithOpenAI,
  fallbackWithPollinations,
} from "../../utils/generateService";

export const transribe = async (req: Request, res: Response) => {
  const { transcript, format, tone } = req.body;

  if (!transcript || !format || !tone) {
    res
      .status(400)
      .json({ error: "Missing required fields: transcript, format, or tone" });
    return;
  }

  try {
    const result = await generateWithOpenAI(transcript, format, tone);

    if (result.success) {
      res
        .status(200)
        .json({
          success: true,
          data: { content: result.content, source: result.source },
        });
      return;
    }

    const fallback = await fallbackWithPollinations(transcript, format, tone);
    if (fallback.success) {
      res
        .status(200)
        .json({
          success: true,
          data: { content: fallback.content, source: fallback.source },
        });
      return;
    }

    res.status(500).json({ error: "Both OpenAI and Pollinations failed" });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};
