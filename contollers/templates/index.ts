import { Request, Response } from "express";
import { templateModel } from "../../models/templates";

interface AuthRequest extends Request {
  user: { id: string };
}
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { name, content, platform } = req.body;

    if (!name || !content || !platform) {
      res.status(400).json({
        success: false,
        error: "Name, content and platform are required fields",
      });
      return;
    }

    // Check for duplicate template name
    const existingTemplate = await templateModel.findOne({
      name,
      isDeleted: false,
    });

    if (existingTemplate) {
      res.status(409).json({
        success: false,
        error: "Template with this name already exists",
      });
      return;
    }

    const template = new templateModel({
      name,
      content,
      platform,
      createdBy: req.user?.id || "system",
      updatedBy: req.user?.id || "system",
    });

    await template.save();

    res.status(201).json({
      success: true,
      data: template,
    });
    return;
  } catch (error: any) {
    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: Object.values(error.errors)
          .map((err: any) => err.message)
          .join(", "),
      });
      return;
    }
    console.error("Template creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create template",
    });
    return;
  }
};

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const platform = req.query.platform as string;
    const search = req.query.search as string;

    const query: any = { isDeleted: false };

    if (platform) {
      query.platform = platform;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const total = await templateModel.countDocuments(query);
    const templates = await templateModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Template fetch error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
    });
  }
};

// Get single template endpoint
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Template ID is required",
      });
    }

    const template = await templateModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
      return;
    }
    console.error("Template fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
    });
    return;
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, content, platform } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        error: "Template ID is required",
      });
      return;
    }

    // Check if template exists
    const existingTemplate = await templateModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingTemplate) {
      res.status(404).json({
        success: false,
        error: "Template not found",
      });
      return;
    }

    // Check for name conflicts if name is being updated
    if (name && name !== existingTemplate.name) {
      const nameConflict = await templateModel.findOne({
        name,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (nameConflict) {
        res.status(409).json({
          success: false,
          error: "Template with this name already exists",
        });
        return;
      }
    }

    const updatedTemplate = await templateModel.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(content && { content }),
        ...(platform && { platform }),
        updatedAt: new Date(),
        updatedBy: req.user?.id || "system",
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedTemplate,
    });
    return;
  } catch (error: any) {
    if (error.name === "ValidationError") {
      res.status(400).json({
        success: false,
        error: Object.values(error.errors)
          .map((err: any) => err.message)
          .join(", "),
      });
      return;
    }
    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
      return;
    }
    console.error("Template update error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update template",
    });
    return;
  }
};

export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: "Template ID is required",
      });
      return;
    }

    const existingTemplate = await templateModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingTemplate) {
      res.status(404).json({
        success: false,
        error: "Template not found",
      });
      return;
    }

    await templateModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user?.id || "system",
      isActive: false,
    });

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
    return;
  } catch (error) {
    if (error.name === "CastError") {
      res.status(400).json({
        success: false,
        error: "Invalid template ID format",
      });
      return;
    }
    console.error("Template deletion error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete template",
    });
    return;
  }
};
