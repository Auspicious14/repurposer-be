import { generateContent } from "../../utils/generateService";
 import { ALLOWED_TONES, SUPPORTED_PLATFORMS } from "../../constants";
 import { Request, Response } from "express";
import { transcribeModel } from "../../models/transcribe";

export const transcribe = async (req: Request, res: Response) => {
  const { transcript, platforms, tone } = req.body;

  // Validate input
  if (!transcript || !platforms || !tone) {
    return res.status(400).json({
      error: "Missing required fields: transcript, platforms, or tone",
    });
  }

  if (!ALLOWED_TONES.includes(tone)) {
    return res.status(400).json({
      error: `Invalid tone. Supported tones are: ${ALLOWED_TONES.join(", ")}`,
    });
  }

  const formats = Array.isArray(platforms) ? platforms : [platforms];
  const invalidPlatforms = formats.filter(p => !SUPPORTED_PLATFORMS.includes(p));
  if (invalidPlatforms.length > 0) {
    return res.status(400).json({
      error: `Unsupported platform(s): ${invalidPlatforms.join(", ")}`,
    });
  }

  try {
    const results: any = [];

    for (const fmt of formats) {
      try {
        const start = Date.now();
        const { content, source } = await generateContent(transcript, fmt, tone);
        results.push({
          format: fmt,
          content,
          source,
          latencyMs: Date.now() - start,
          
        });
      } catch (err: any) {
        console.error(`Failed for format: ${fmt}`, err);
        results.push({
          format: fmt,
          error: err.message || "Failed to generate content",
        });
      }
    }

    // Optional: save to DB if all or some succeeded
    const successful = results.filter(r => r.content);
    if (successful.length > 0) {
      try {
        await transcribeModel.create({
          transcript,
          tone,
          formats: successful,
          metadata: {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          },
          createdAt: new Date(),
        });
      } catch (dbErr: any) {
        console.error("Database save error:", dbErr);
        // Decide whether to return an error or just log it and continue
        // For now, we'll just log and continue, as content generation was successful
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
    });

  } catch (err: any) {
    console.error("Unexpected server error", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
