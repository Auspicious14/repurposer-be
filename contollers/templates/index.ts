// controllers/templateController.ts
import { Request, Response } from "express";
import { templateModel } from "../../models/templates";
import { AuthRequest } from "../../types/auth";
import { 
  handleTemplateError, 
  createValidationError, 
  createNotFoundError, 
  createConflictError,
  createInvalidIdError 
} from "../../utils/errorHandler";

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
      throw createValidationError("content", "Template must contain at least one placeholder (e.g., {{title}})");
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
      message: "Template created successfully"
    });

  } catch (error) {
    handleTemplateError(error, res, "creation");
  }
};

export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const platform = req.query.platform as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string || "createdAt";
    const sortOrder = req.query.sortOrder as string || "desc";

    // Build query
    const query: any = {
      createdBy: req.user?.id
    };

    if (platform) {
      const validPlatforms = ["twitter", "linkedin", "instagram", "blog", "email", "facebook", "tiktok"];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        throw createValidationError("platform", `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`);
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
        .select("-__v")
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
        hasPrev: page > 1
      },
      message: `Found ${templates.length} template${templates.length !== 1 ? 's' : ''}`
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
    const placeholders = [...(template.content.match(placeholderRegex) || [])]
      .map(match => match.slice(2, -2));

    res.status(200).json({
      success: true,
      data: {
        ...template.toObject(),
        placeholders: [...new Set(placeholders)] // Remove duplicates
      },
      message: "Template retrieved successfully"
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
      updatedAt: new Date()
    };

    if (name !== undefined) {
      if (!name?.trim()) {
        throw createValidationError("name", "Template name cannot be empty");
      }
      
      if (name.trim() !== existingTemplate.name) {
        const nameConflict = await templateModel.findOne({
          name: name.trim(),
          _id: { $ne: id },
          createdBy: req.user?.id
        });

        if (nameConflict) {
          throw createConflictError("Template name", name);
        }
      }
      updateData.name = name.trim();
    }

    if (content !== undefined) {
      if (!content?.trim()) {
        throw createValidationError("content", "Template content cannot be empty");
      }

      const placeholderRegex = /\{\{(\w+)\}\}/g;
      const placeholders = content.match(placeholderRegex);
      
      if (!placeholders || placeholders.length === 0) {
        throw createValidationError("content", "Template must contain at least one placeholder (e.g., {{title}})");
      }

      updateData.content = content.trim();
    }

    if (platform !== undefined) {
      if (!platform?.trim()) {
        throw createValidationError("platform", "Platform cannot be empty");
      }

      const validPlatforms = ["twitter", "linkedin", "instagram", "blog", "email", "facebook", "tiktok"];
      if (!validPlatforms.includes(platform.toLowerCase())) {
        throw createValidationError("platform", `Invalid platform. Must be one of: ${validPlatforms.join(", ")}`);
      }

      updateData.platform = platform.toLowerCase();
    }

    const updatedTemplate = await templateModel.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        select: "-__v"
      }
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate,
      message: "Template updated successfully"
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
        name: existingTemplate.name
      }
    });

  } catch (error) {
    handleTemplateError(error, res, "deletion");
  }
};


export const previewTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { content, tone, sampleData, platform } = req.body;

    if (!content?.trim()) {
      throw createValidationError("content", "Content is required for preview");
    }
    if (!tone?.trim()) {
      throw createValidationError("tone", "Tone is required for preview");
    }
    if (!sampleData || typeof sampleData !== 'object') {
      throw createValidationError("sampleData", "Sample data is required for preview");
    }

    // Extract placeholders
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    let previewContent = content;
    const foundPlaceholders: string[] = [];

    // Replace placeholders with sample data
    previewContent = previewContent.replace(placeholderRegex, (match, placeholder) => {
      foundPlaceholders.push(placeholder);
      return sampleData[placeholder] || match;
    });

    // Apply tone modifications (basic implementation)
    switch (tone.toLowerCase()) {
      case 'casual':
        // Add casual modifications
        break;
      case 'professional':
        // Add professional modifications
        break;
      case 'friendly':
        previewContent = previewContent.replace(/\./g, '! 😊');
        break;
      case 'formal':
        // Add formal modifications
        break;
      case 'humorous':
        previewContent += ' 😄';
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        content: previewContent,
        metadata: {
          originalContent: content,
          tone,
          platform: platform || 'generic',
          placeholdersFound: [...new Set(foundPlaceholders)],
          wordCount: previewContent.split(/\s+/).length,
          characterCount: previewContent.length
        }
      },
      message: "Preview generated successfully"
    });

  } catch (error) {
    handleTemplateError(error, res, "preview generation");
  }
};

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
      createdBy: req.user?.id
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
      message: "Template duplicated successfully"
    });

  } catch (error) {
    handleTemplateError(error, res, "duplication");
  }
};
