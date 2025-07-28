// controllers/templateController.ts
import { Request, Response } from "express";
import { templateModel } from "../../models/templates";
import { AuthRequest } from "../../types/auth";
import {
  handleTemplateError,
  createValidationError,
  createNotFoundError,
  createConflictError,
  createInvalidIdError,
} from "../../utils/errorHandler";
import { TONE_PROMPTS, PLATFORM_GUIDELINES } from "../../constants";
import { openai } from "../../utils/aiProvider";
// import { applyBasicToneTransformation } from "../../utils/toneTransform";
// import { applyPlatformFormatting } from "../../utils/applyPlatformFormat";

export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, platform } = req.body;

    // Validation
    if (!name?.trim()) {
      throw createValidationError("name", "Template name is required");
    }
    if (!content?.trim()) {
      throw createValidationError("content", "Template content is required");
    }
    if (!platform?.trim()) {
      throw createValidationError("platform", "Platform is required");
    }

    // Check for existing template with same name
    const existingTemplate = await templateModel.findOne({
      name: name.trim(),
      createdBy: req.user?.id,
    });

    if (existingTemplate) {
      throw createConflictError("Template name", name);
    }

    // Validate placeholders exist in content
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders = content.match(placeholderRegex);

    if (!placeholders || placeholders.length === 0) {
      throw createValidationError(
        "content",
        "Template must contain at least one placeholder (e.g., {{title}})"
      );
    }

    // Create template
    const template = new templateModel({
      name: name.trim(),
      content: content.trim(),
      platform: platform.toLowerCase(),
      createdBy: req.user?.id || "system",
      updatedBy: req.user?.id || "system",
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
      message: "Template created successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "creation");
  }
};

export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 10)
    );
    const platform = req.query.platform as string;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) || "desc";

    // Build query
    const query: any = {
      createdBy: req.user?.id,
    };

    if (platform) {
      const validPlatforms = [
        "twitter",
        "linkedin",
        "instagram",
        "blog",
        "email",
        "facebook",
        "tiktok",
      ];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        throw createValidationError(
          "platform",
          `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`
        );
      }
      query.platform = platform.toLowerCase();
    }

    if (search?.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { content: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Build sort object
    const sortObj: any = {};
    const validSortFields = ["name", "platform", "createdAt", "updatedAt"];
    if (validSortFields.includes(sortBy)) {
      sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortObj.createdAt = -1; // Default sort
    }

    const [total, templates] = await Promise.all([
      templateModel.countDocuments(query),
      templateModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sortObj)
        .select("-__v"),
    ]);

    res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      message: `Found ${templates.length} template${
        templates.length !== 1 ? "s" : ""
      }`,
    });
  } catch (error) {
    handleTemplateError(error, res, "fetch");
  }
};

export const getTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Template ID is required");
    }

    const template = await templateModel
      .findOne({
        _id: id,
        createdBy: req.user?.id,
      })
      .select("-__v");

    if (!template) {
      throw createNotFoundError("Template");
    }

    // Extract placeholders from content
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders = [
      ...(template.content.match(placeholderRegex) || []),
    ].map((match) => match.slice(2, -2));

    res.status(200).json({
      success: true,
      data: {
        ...template.toObject(),
        placeholders: [...new Set(placeholders)], // Remove duplicates
      },
      message: "Template retrieved successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "fetch");
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, content, platform } = req.body;

    if (!id?.trim()) {
      throw createValidationError("id", "Template ID is required");
    }

    // Find existing template
    const existingTemplate = await templateModel.findOne({
      _id: id,
      createdBy: req.user?.id,
    });

    if (!existingTemplate) {
      throw createNotFoundError("Template");
    }

    // Build update object
    const updateData: any = {
      updatedBy: req.user?.id || "system",
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name?.trim()) {
        throw createValidationError("name", "Template name cannot be empty");
      }

      if (name.trim() !== existingTemplate.name) {
        const nameConflict = await templateModel.findOne({
          name: name.trim(),
          _id: { $ne: id },
          createdBy: req.user?.id,
        });

        if (nameConflict) {
          throw createConflictError("Template name", name);
        }
      }
      updateData.name = name.trim();
    }

    if (content !== undefined) {
      if (!content?.trim()) {
        throw createValidationError(
          "content",
          "Template content cannot be empty"
        );
      }

      const placeholderRegex = /\{\{(\w+)\}\}/g;
      const placeholders = content.match(placeholderRegex);

      if (!placeholders || placeholders.length === 0) {
        throw createValidationError(
          "content",
          "Template must contain at least one placeholder (e.g., {{title}})"
        );
      }

      updateData.content = content.trim();
    }

    if (platform !== undefined) {
      if (!platform?.trim()) {
        throw createValidationError("platform", "Platform cannot be empty");
      }

      const validPlatforms = [
        "twitter",
        "linkedin",
        "instagram",
        "blog",
        "email",
        "facebook",
        "tiktok",
      ];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        throw createValidationError(
          "platform",
          `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`
        );
      }

      updateData.platform = platform.toLowerCase();
    }

    const updatedTemplate = await templateModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
        select: "-__v",
      }
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate,
      message: "Template updated successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "update");
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Template ID is required");
    }

    const existingTemplate = await templateModel.findOne({
      _id: id,
      createdBy: req.user?.id,
    });

    if (!existingTemplate) {
      throw createNotFoundError("Template");
    }

    // Soft delete - uncomment and modify based on your schema
    // await templateModel.findByIdAndUpdate(id, {
    //   deletedAt: new Date(),
    //   deletedBy: req.user?.id || "system",
    //   isActive: false,
    // });

    await templateModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
      data: {
        id: existingTemplate._id,
        name: existingTemplate.name,
      },
    });
  } catch (error) {
    handleTemplateError(error, res, "deletion");
  }
};

// export const previewTemplate = async (req: AuthRequest, res: Response) => {
//   try {
//     const { content, tone, sampleData, platform } = req.body;

//     if (!content?.trim()) {
//       throw createValidationError("content", "Content is required for preview");
//     }
//     if (!tone?.trim()) {
//       throw createValidationError("tone", "Tone is required for preview");
//     }
//     if (!sampleData || typeof sampleData !== 'object') {
//       throw createValidationError("sampleData", "Sample data is required for preview");
//     }

//     // Extract placeholders
//     const placeholderRegex = /\{\{(\w+)\}\}/g;
//     let previewContent = content;
//     const foundPlaceholders: string[] = [];

//     // Replace placeholders with sample data
//     previewContent = previewContent.replace(placeholderRegex, (match, placeholder) => {
//       foundPlaceholders.push(placeholder);
//       return sampleData[placeholder] || match;
//     });

//     // Apply tone modifications (basic implementation)
//     switch (tone.toLowerCase()) {
//       case 'casual':
//         // Add casual modifications
//         break;
//       case 'professional':
//         // Add professional modifications
//         break;
//       case 'friendly':
//         previewContent = previewContent.replace(/\./g, '! 😊');
//         break;
//       case 'formal':
//         // Add formal modifications
//         break;
//       case 'humorous':
//         previewContent += ' 😄';
//         break;
//     }

//     res.status(200).json({
//       success: true,
//       data: {
//         content: previewContent,
//         metadata: {
//           originalContent: content,
//           tone,
//           platform: platform || 'generic',
//           placeholdersFound: [...new Set(foundPlaceholders)],
//           wordCount: previewContent.split(/\s+/).length,
//           characterCount: previewContent.length
//         }
//       },
//       message: "Preview generated successfully"
//     });

//   } catch (error) {
//     handleTemplateError(error, res, "preview generation");
//   }
// };

export const duplicateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id?.trim()) {
      throw createValidationError("id", "Template ID is required");
    }

    const originalTemplate = await templateModel.findOne({
      _id: id,
      createdBy: req.user?.id,
    });

    if (!originalTemplate) {
      throw createNotFoundError("Template");
    }

    const duplicateName = name?.trim() || `${originalTemplate.name} (Copy)`;

    const nameConflict = await templateModel.findOne({
      name: duplicateName,
      createdBy: req.user?.id,
    });

    if (nameConflict) {
      throw createConflictError("Template name", duplicateName);
    }

    const duplicatedTemplate = new templateModel({
      name: duplicateName,
      content: originalTemplate.content,
      platform: originalTemplate.platform,
      createdBy: req.user?.id || "system",
      updatedBy: req.user?.id || "system",
    });

    await duplicatedTemplate.save();

    res.status(201).json({
      success: true,
      data: duplicatedTemplate,
      message: "Template duplicated successfully",
    });
  } catch (error) {
    handleTemplateError(error, res, "duplication");
  }
};

// export const previewTemplate = async (req: AuthRequest, res: Response) => {
//   try {
//     const { content, tone, sampleData, platform } = req.body;

//     if (!content?.trim()) {
//       throw createValidationError("content", "Content is required for preview");
//     }
//     if (!tone?.trim()) {
//       throw createValidationError("tone", "Tone is required for preview");
//     }
//     if (!sampleData || typeof sampleData !== "object") {
//       throw createValidationError(
//         "sampleData",
//         "Sample data is required for preview"
//       );
//     }

//     // Step 1: Replace placeholders with sample data
//     const placeholderRegex = /\{\{(\w+)\}\}/g;
//     let processedContent = content;
//     const foundPlaceholders: string[] = [];
//     const missingPlaceholders: string[] = [];

//     // Replace placeholders and track what we find
//     processedContent = processedContent.replace(
//       placeholderRegex,
//       (match, placeholder) => {
//         foundPlaceholders.push(placeholder);

//         if (
//           sampleData[placeholder] !== undefined &&
//           sampleData[placeholder] !== ""
//         ) {
//           return sampleData[placeholder];
//         } else {
//           missingPlaceholders.push(placeholder);
//           return [`${placeholder}`];
//         }
//       }
//     );

//     let finalContent = processedContent;

//     if (tone !== "neutral" && TONE_PROMPTS[tone]) {
//       try {
//         const toneConfig = TONE_PROMPTS[tone];
//         const platformGuideline = platform
//           ? PLATFORM_GUIDELINES[platform] || ""
//           : "";

//         const aiPrompt = `${toneConfig.systemPrompt} TASK: ${
//           toneConfig.instructions
//         } ${platformGuideline ? `PLATFORM: ${platformGuideline}` : ""}

// CONTENT TO TRANSFORM:
// "${processedContent}"

// REQUIREMENTS:
// - Keep the same structure and meaning
// - Don't add or remove placeholder values that were filled in
// - Maintain any emojis, hashtags, or special formatting
// - Only change the tone and style, not the facts or data
// - Return only the transformed content, no explanations

// TRANSFORMED CONTENT:`;
//         const response = await openai.chat.completions.create({
//           model: "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
//           messages: [
//             {
//               role: "system",
//               content: toneConfig.systemPrompt,
//             },
//             {
//               role: "user",
//               content: aiPrompt,
//             },
//           ],
//         });

//         const aiTransformedContent =
//           response.choices[0]?.message?.content?.trim();

//         if (aiTransformedContent) {
//           finalContent = aiTransformedContent;
//         }
//       } catch (aiError) {
//         console.error("AI transformation error:", aiError);
//         // Fall back to simple tone modifications if AI fails
//         finalContent = applyBasicToneTransformation(processedContent, tone);
//       }
//     }

//     // Step 3: Apply platform-specific formatting
//     if (platform) {
//       finalContent = applyPlatformFormatting(finalContent, platform);
//     }

//     // Step 4: Generate metadata
//     const metadata = {
//       originalContent: content,
//       tone,
//       platform: platform || "generic",
//       placeholdersFound: [...new Set(foundPlaceholders)],
//       missingPlaceholders,
//       wordCount: finalContent.split(/\s+/).filter((word) => word.length > 0)
//         .length,
//       characterCount: finalContent.length,
//       estimatedReadTime: Math.ceil(finalContent.split(/\s+/).length / 200), // ~200 WPM
//       aiTransformed: tone !== "neutral" && TONE_PROMPTS[tone] ? true : false,
//     };

//     res.status(200).json({
//       success: true,
//       data: {
//         content: finalContent,
//         metadata,
//       },
//       message: "Preview generated successfully",
//     });
//   } catch (error) {
//     handleTemplateError(error, res, "preview generation");
//   }
// };

// controllers/templateController.ts - Add this to your existing controller

// export const previewTemplate = async (req: AuthRequest, res: Response) => {
//   try {
//     const { content, tone, sampleData, platform } = req.body;

//     if (!content?.trim()) {
//       throw createValidationError("content", "Content is required for preview");
//     }
//     if (!tone?.trim()) {
//       throw createValidationError("tone", "Tone is required for preview");
//     }
//     if (!sampleData || typeof sampleData !== "object") {
//       throw createValidationError(
//         "sampleData",
//         "Sample data is required for preview"
//       );
//     }

//     // Step 1: Replace placeholders with sample data
//     const placeholderRegex = /\{\{(\w+)\}\}/g;
//     let previewContent = content;
//     const foundPlaceholders: string[] = [];
//     const missingPlaceholders: string[] = [];

//     // Track and replace placeholders
//     previewContent = previewContent.replace(
//       placeholderRegex,
//       (match, placeholder) => {
//         foundPlaceholders.push(placeholder);

//         if (
//           sampleData[placeholder] &&
//           sampleData[placeholder].toString().trim()
//         ) {
//           return sampleData[placeholder];
//         } else {
//           missingPlaceholders.push(placeholder);
//           return [`Missing: ${placeholder}`];
//         }
//       }
//     );

//     // Step 2: Apply simple tone transformations (fast, no AI)
//     previewContent = applyToneTransformation(previewContent, tone);

//     // Step 3: Apply platform-specific formatting
//     if (platform) {
//       previewContent = applyPlatformFormatting(previewContent, platform);
//     }

//     // Step 4: Generate metadata
//     const words = previewContent.split(/\s+/).filter((word) => word.length > 0);
//     const metadata = {
//       originalContent: content,
//       tone,
//       platform: platform || "generic",
//       placeholdersFound: [...new Set(foundPlaceholders)],
//       missingPlaceholders,
//       wordCount: words.length,
//       characterCount: previewContent.length,
//       estimatedReadTime: Math.max(1, Math.ceil(words.length / 200)),
//       hasAllPlaceholders: missingPlaceholders.length === 0,
//     };

//     res.status(200).json({
//       success: true,
//       data: {
//         content: previewContent,
//         metadata,
//       },
//       message: "Preview generated successfully",
//     });
//   } catch (error) {
//     handleTemplateError(error, res, "preview generation");
//   }
// };

// controllers/templateController.ts - Replace the previewTemplate function

export const previewTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { content, tone, sampleData, platform } = req.body;

    // Quick validation
    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Content is required",
      });
    }

    // INSTANT processing - no delays, no heavy operations
    const result = processTemplatePreview(
      content,
      tone || "professional",
      sampleData || {},
      platform || "generic"
    );

    // Send response immediately
    res.status(200).json({
      success: true,
      data: result,
      message: "Preview generated",
    });
  } catch (error) {
    console.error("Preview error:", error);
    res.status(500).json({
      success: false,
      error: "Preview failed",
    });
  }
};

// Ultra-fast processing function
function processTemplatePreview(
  content: string,
  tone: string,
  sampleData: Record<string, string>,
  platform: string
) {
  // Step 1: Replace placeholders (fastest operation)
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  let processed = content.replace(
    placeholderRegex,
    (match: string, placeholder: string | string[]): any => {
      return sampleData[placeholder as any] || [`${placeholder}`];
    }
  );

  // Step 2: Apply tone (simple string operations only)
  processed = applyQuickTone(processed, tone);

  // Step 3: Apply platform formatting (minimal processing)
  processed = applyQuickPlatform(processed, platform);

  // Step 4: Generate minimal metadata
  const words = processed.split(/\s+/).filter((w) => w.length > 0);

  return {
    content: processed,
    metadata: {
      wordCount: words.length,
      characterCount: processed.length,
      tone,
      platform,
    },
  };
}

// Lightning-fast tone application
function applyQuickTone(text: string, tone: string): string {
  switch (tone) {
    case "casual":
      return text
        .replace(/\bdo not\b/gi, "don't")
        .replace(/\bcannot\b/gi, "can't")
        .replace(/\bHello\b/gi, "Hey");

    case "professional":
      return text
        .replace(/\bHey\b/gi, "Hello")
        .replace(/\bdon't\b/gi, "do not")
        .replace(/!+/g, ".");

    case "friendly":
      return text.replace(/\.$/, "!");

    case "formal":
      return text.replace(/\bget\b/gi, "obtain").replace(/!+/g, ".");

    case "humorous":
      return text + (Math.random() > 0.5 ? " 😄" : " ✨");

    case "persuasive":
      return text
        .replace(/\btoday\b/gi, "today only")
        .replace(/\bfree\b/gi, "absolutely free");

    default:
      return text;
  }
}

// Lightning-fast platform formatting
function applyQuickPlatform(text: string, platform: string): string {
  switch (platform) {
    case "twitter":
      return text.length > 280 ? text.substring(0, 277) + "..." : text;

    case "instagram":
      return text.replace(/\. /g, ".\n\n");

    case "email":
      return text.includes("Subject:")
        ? text
        : `Subject: ${text.split("\n")[0]}\n\n${text}`;

    case "linkedin":
      return text + (text.includes("Best regards") ? "" : "\n\nBest regards");

    default:
      return text;
  }
}
