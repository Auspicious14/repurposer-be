import { generateContent } from "../../utils/generateService";
import { ALLOWED_TONES, SUPPORTED_PLATFORMS } from "../../constants";
import { Response } from "express";
import { AuthRequest } from "../../types/auth";
import { transcribeModel } from "../../models/transcribe";
import { templateModel } from "../../models/templates";
import {
  handleTemplateError,
  createValidationError,
} from "../../utils/errorHandler";

export const transcribe = async (req: AuthRequest, res: Response) => {
  try {
    const {
      transcript,
      platforms,
      tone,
      templateId,
      templateData,
      useTemplate = false,
    } = req.body;

    let finalContent = transcript;
    let templateInfo: any = null;

    if (useTemplate && templateId && templateData) {
      try {
        const template = await templateModel.findById(templateId);
        if (!template) {
          return res.status(404).json({
            success: false,
            error: "Template not found",
          });
        }

        finalContent = template.content;
        const placeholderRegex = /\{\{(\w+)\}\}/g;

        finalContent = finalContent.replace(
          placeholderRegex,
          (match, placeholder) => {
            return templateData[placeholder] || match;
          }
        );

        templateInfo = {
          templateId: template._id,
          templateName: template.name,
          templatePlatform: template.platform,
          placeholdersUsed: Object.keys(templateData),
          originalTemplate: template.content,
        };

        console.log("Template processed:", {
          templateName: template.name,
          finalContent,
        });
      } catch (templateError) {
        console.error("Template processing error:", templateError);
        return res.status(400).json({
          success: false,
          error: "Failed to process template",
        });
      }
    }

    if (!finalContent || !platforms || !tone) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: content, platforms, or tone",
      });
    }

    if (!ALLOWED_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tone. Supported tones are: ${ALLOWED_TONES.join(", ")}`,
      });
    }

    const formats = Array.isArray(platforms) ? platforms : [platforms];
    const invalidPlatforms = formats.filter(
      (p) => !SUPPORTED_PLATFORMS.includes(p)
    );
    if (invalidPlatforms.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform(s): ${invalidPlatforms.join(", ")}`,
      });
    }

    const results: any = [];

    for (const fmt of formats) {
      try {
        const start = Date.now();
        const { content, source } = await generateContent(
          finalContent,
          fmt,
          tone
        );

        results.push({
          format: fmt,
          content,
          source,
          latencyMs: Date.now() - start,
          success: true,
        });
      } catch (err: any) {
        console.error(`Failed for format: ${fmt}, err`);
        results.push({
          format: fmt,
          error: err.message || "Failed to generate content",
          success: false,
        });
      }
    }

    const successful = results.filter((r) => r.success && r.content);
    if (successful.length > 0) {
      try {
        await transcribeModel.create({
          transcript: finalContent,
          originalTranscript: transcript,
          tone,
          formats: results,
          userId: req.user?.id,
          templateInfo: templateInfo,
          isTemplateGenerated: useTemplate,
          metadata: {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            templateProcessed: !!templateInfo,
            platformsRequested: formats.length,
            successfulPlatforms: successful.length,
          },
          createdAt: new Date(),
        });
      } catch (dbErr: any) {
        console.error("Database save error:", dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        results,
        templateInfo,
        processedContent: finalContent,
        summary: {
          requested: formats.length,
          successful: successful.length,
          failed: results.filter((r) => !r.success).length,
        },
      },
    });
  } catch (err: any) {
    console.error("Transcribe error:", err);
    handleTemplateError(err, res, "content generation");
  }
};

export const getContentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      platform,
      tone,
      dateRange,
      search,
      templateOnly = false,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const query: any = {};
    if (req.user?.id) {
      query.userId = req.user.id;
    }

    if (templateOnly === "true") {
      query.isTemplateGenerated = true;
    }

    if (tone && tone !== "") {
      query.tone = tone;
    }

    if (dateRange && dateRange !== "") {
      const now = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          query.createdAt = { $gte: startDate };
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          query.createdAt = { $gte: startDate };
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          query.createdAt = { $gte: startDate };
          break;
      }
    }

    if (search && search !== "") {
      const searchRegex = { $regex: search as string, $options: "i" };
      query.$or = [
        { transcript: searchRegex },
        { originalTranscript: searchRegex },
        { "formats.content": searchRegex },
        { "templateInfo.templateName": searchRegex },
      ];
    }

    if (platform && platform !== "") {
      query["formats.format"] = platform;
    }

    const sortObj: any = {};
    if (sortBy === "createdAt") {
      sortObj.createdAt = sortOrder === "asc" ? 1 : -1;
    } else {
      sortObj.createdAt = -1;
    }

    const [transcriptions, total] = await Promise.all([
      transcribeModel
        .find(query)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      transcribeModel.countDocuments(query),
    ]);

    const enhancedContents = transcriptions.flatMap((transcription) => {
      const successfulFormats =
        transcription.formats?.filter((f) => f.content && f.success) || [];

      const filteredFormats = platform
        ? successfulFormats.filter((f) => f.format === platform)
        : successfulFormats;

      return filteredFormats.map((format) => ({
        _id: `${transcription._id}_${format.format}`,
        originalContent:
          transcription.originalTranscript || transcription.transcript,
        repurposedContent: format.content,

        templateId: transcription.templateInfo?.templateId || null,
        templateName:
          transcription.templateInfo?.templateName ||
          (transcription.isTemplateGenerated
            ? "Unknown Template"
            : "Direct Input"),

        platform: format.format,
        tone: transcription.tone,
        sampleData: transcription.templateInfo?.templateData || {},

        createdAt: transcription.createdAt,
        updatedAt: transcription.createdAt,
        createdBy: transcription.userId || "anonymous",

        metadata: {
          wordCount: format.content.split(/\s+/).filter((w) => w.length > 0)
            .length,
          characterCount: format.content.length,
          placeholdersUsed: transcription.templateInfo?.placeholdersUsed || [],
          source: format.source,
          latencyMs: format.latencyMs,
          isTemplateGenerated: transcription.isTemplateGenerated || false,
          originalTemplate: transcription.templateInfo?.originalTemplate,
        },

        estimatedReadTime: Math.max(
          1,
          Math.ceil(format.content.split(/\s+/).length / 200)
        ),
        contentPreview:
          format.content.substring(0, 150) +
          (format.content.length > 150 ? "..." : ""),
        transcriptionId: transcription._id,
      }));
    });

    const totalItems = enhancedContents.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedContents = enhancedContents.slice(
      startIndex,
      startIndex + limitNum
    );
    const totalPages = Math.ceil(totalItems / limitNum);

    res.status(200).json({
      success: true,
      data: paginatedContents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalItems,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        platform: platform || null,
        tone: tone || null,
        dateRange: dateRange || null,
        search: search || null,
        templateOnly: templateOnly === "true",
      },
      message: `Found ${paginatedContents.length} content item${
        paginatedContents.length !== 1 ? "s" : ""
      }`,
    });
  } catch (error) {
    handleTemplateError(error, res, "content history fetch");
  }
};

export const getContentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Content ID is required");
    }

    const [transcriptionId, format] = id.includes("_")
      ? id.split("_")
      : [id, null];

    const transcription = await transcribeModel
      .findById(transcriptionId)
      .lean();

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    if (format) {
      const requestedFormat = transcription.formats?.find(
        (f) => f.format === format
      );

      if (!requestedFormat || !requestedFormat.content) {
        return res.status(404).json({
          success: false,
          error: "Format not found or failed to generate",
        });
      }

      const enhancedContent = {
        _id: id,
        originalContent: transcription.transcript,
        repurposedContent: requestedFormat.content,
        templateId: null,
        templateName: "AI Generated",
        platform: requestedFormat.format,
        tone: transcription.tone,
        sampleData: {},
        createdAt: transcription.createdAt,
        updatedAt: transcription.createdAt,
        createdBy: transcription.userId || "anonymous",
        metadata: {
          wordCount: requestedFormat.content
            .split(/\s+/)
            .filter((w) => w.length > 0).length,
          characterCount: requestedFormat.content.length,
          placeholdersUsed: [],
          source: requestedFormat.source,
          latencyMs: requestedFormat.latencyMs,
        },
        estimatedReadTime: Math.max(
          1,
          Math.ceil(requestedFormat.content.split(/\s+/).length / 200)
        ),
        transcriptionId: transcription._id,
        allFormats: transcription.formats?.filter((f) => f.content) || [],
      };

      return res.status(200).json({
        success: true,
        data: enhancedContent,
        message: "Content retrieved successfully",
      });
    }

    const successfulFormats =
      transcription.formats?.filter((f) => f.content && !f.error) || [];

    const allContents = successfulFormats.map((format) => ({
      _id: `${transcription._id}_${format.format}`,
      originalContent: transcription.transcript,
      repurposedContent: format.content,
      templateId: null,
      templateName: "AI Generated",
      platform: format.format,
      tone: transcription.tone,
      sampleData: {},
      createdAt: transcription.createdAt,
      updatedAt: transcription.createdAt,
      createdBy: transcription.userId || "anonymous",
      metadata: {
        wordCount: format.content.split(/\s+/).filter((w) => w.length > 0)
          .length,
        characterCount: format.content.length,
        placeholdersUsed: [],
        source: format.source,
        latencyMs: format.latencyMs,
      },
      estimatedReadTime: Math.max(
        1,
        Math.ceil(format.content.split(/\s+/).length / 200)
      ),
    }));

    res.status(200).json({
      success: true,
      data: allContents,
      message: "All formats retrieved successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "content fetch");
  }
};

export const getTemplatesForRepurpose = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const templates = await templateModel
      .find({ createdBy: req.user?.id })
      .select("_id name platform content createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const enhancedTemplates = templates.map((template) => {
      const placeholders = (template.content.match(/\{\{(\w+)\}\}/g) || []).map(
        (match) => match.slice(2, -2)
      );

      return {
        ...template,
        placeholders: [...new Set(placeholders)],
        placeholderCount: placeholders.length,
      };
    });

    res.status(200).json({
      success: true,
      data: enhancedTemplates,
      message: `Found ${enhancedTemplates.length} template${
        enhancedTemplates.length !== 1 ? "s" : ""
      }`,
    });
  } catch (error) {
    handleTemplateError(error, res, "templates fetch");
  }
};

export const deleteContentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Content ID is required");
    }

    const [transcriptionId] = id.includes("") ? id.split("") : [id];
    const transcription = await transcribeModel.findById(transcriptionId);

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: "Content not found",
      });
    }

    await transcribeModel.findByIdAndDelete(transcriptionId);

    res.status(200).json({
      success: true,
      message: "Content deleted successfully",
      data: {
        id: transcriptionId,
        templateName: transcription.templateInfo?.templateName,
        formatsDeleted: transcription.formats?.length || 0,
      },
    });
  } catch (error) {
    handleTemplateError(error, res, "content deletion");
  }
};

export const getContentStats = async (req: AuthRequest, res: Response) => {
  try {
    const query: any = {};
    if (req.user?.id) {
      query.userId = req.user.id;
    }

    const [totalTranscriptions, platformStats, toneStats, recentActivity] =
      await Promise.all([
        transcribeModel.countDocuments(query),
        transcribeModel.aggregate([
          { $match: query },
          { $unwind: "$formats" },
          { $match: { "formats.content": { $exists: true, $ne: null } } },
          { $group: { _id: "$formats.format", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        transcribeModel.aggregate([
          { $match: query },
          { $group: { _id: "$tone", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        transcribeModel.aggregate([
          {
            $match: {
              ...query,
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalTranscriptions,
        platformStats: platformStats.map((stat) => ({
          platform: stat._id,
          count: stat.count,
        })),
        toneStats: toneStats.map((stat) => ({
          tone: stat._id,
          count: stat.count,
        })),
        recentActivity: recentActivity.map((stat) => ({
          date: stat._id,
          count: stat.count,
        })),
      },
      message: "Statistics retrieved successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "statistics fetch");
  }
};
