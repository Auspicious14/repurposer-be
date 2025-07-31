// controllers/repurposeController.ts
import { Response } from "express";
import { AuthRequest } from "../../types/auth";
import { 
  handleTemplateError, 
  createValidationError 
} from "../../utils/templateErrorHandler";
import { transcribeModel } from "../../models/transcribe";

// Get content history from transcription records
export const getContentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      platform, 
      tone, 
      dateRange, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    // Build query - Note: your model doesn't have createdBy, so we'll use IP or other identifier
    const query: any = {};

    // If you have user authentication, add user filter
    // For now, we'll filter by IP or add a user field to your model
    if (req.user?.id) {
      query.userId = req.user.id; // You'll need to add this field to your model
    }

    // Tone filter
    if (tone && tone !== '') {
      query.tone = tone;
    }

    // Date range filter
    if (dateRange && dateRange !== '') {
      const now = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          query.createdAt = { $gte: startDate };
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          query.createdAt = { $gte: startDate };
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          query.createdAt = { $gte: startDate };
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          query.createdAt = { $gte: startDate };
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          query.createdAt = { $gte: startDate };
          break;
      }
    }

    // Search filter - search in transcript and generated content
    if (search && search !== '') {
      const searchRegex = { $regex: search as string, $options: 'i' };
      query.$or = [
        { transcript: searchRegex },
        { 'formats.content': searchRegex },
        { tone: searchRegex }
      ];
    }

    // Platform filter - check if any format matches the platform
    if (platform && platform !== '') {
      query['formats.format'] = platform;
    }

    // Build sort object
    const sortObj: any = {};
    const validSortFields = ['createdAt', 'tone'];
    
    if (validSortFields.includes(sortBy as string)) {
      sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortObj.createdAt = -1; // Default sort
    }

    // Execute queries in parallel
    const [transcriptions, total] = await Promise.all([
      transcribeModel
        .find(query)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      transcribeModel.countDocuments(query)
    ]);

    // Transform transcription data to match frontend expectations
    const enhancedContents = transcriptions.flatMap(transcription => {
      // Filter successful formats
      const successfulFormats = transcription.formats?.filter(f => f.content && !f.error) || [];
      
      // If platform filter is applied, filter formats
      const filteredFormats = platform 
        ? successfulFormats.filter(f => f.format === platform)
        : successfulFormats;

      return filteredFormats.map(format => ({
        _id: `${transcription._id}_${format.format}`, // Composite ID
        originalContent: transcription.transcript,
        repurposedContent: format.content,
        templateId: null,
        templateName: 'AI Generated',
        platform: format.format,
        tone: transcription.tone,
        sampleData: {}, // No sample data in transcription model
        createdAt: transcription.createdAt,
        updatedAt: transcription.createdAt,
        createdBy: transcription.userId || 'anonymous',
        metadata: {
          wordCount: format.content.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: format.content.length,
          placeholdersUsed: [],
          source: format.source,
          latencyMs: format.latencyMs
        },
        estimatedReadTime: Math.max(1, Math.ceil(format.content.split(/\s+/).length / 200)),
        contentPreview: format.content.substring(0, 150) + (format.content.length > 150 ? '...' : ''),
        transcriptionId: transcription._id // Keep reference to original transcription
      }));
    });

    // Apply pagination to flattened results
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedContents = enhancedContents.slice(startIndex, startIndex + limitNum);

    // Calculate pagination info
    const totalItems = enhancedContents.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.status(200).json({
      success: true,
      data: paginatedContents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalItems,
        totalPages,
        hasNext,
        hasPrev
      },
      filters: {
        platform: platform || null,
        tone: tone || null,
        dateRange: dateRange || null,
        search: search || null
      },
      message: `Found ${paginatedContents.length} content item${paginatedContents.length !== 1 ? 's' : ''}`
    });

  } catch (error) {
    handleTemplateError(error, res, "content history fetch");
  }
};

// Get single transcription with all its formats
export const getContentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Content ID is required");
    }

    // Handle composite ID (transcriptionId_format) or regular transcription ID
    const [transcriptionId, format] = id.includes('_') ? id.split('_') : [id, null];

    const transcription = await transcribeModel
      .findById(transcriptionId)
      .lean();

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: "Content not found"
      });
    }

    // If specific format requested, return only that format
    if (format) {
      const requestedFormat = transcription.formats?.find(f => f.format === format);
      
      if (!requestedFormat || !requestedFormat.content) {
        return res.status(404).json({
          success: false,
          error: "Format not found or failed to generate"
        });
      }

      const enhancedContent = {
        _id: id,
        originalContent: transcription.transcript,
        repurposedContent: requestedFormat.content,
        templateId: null,
        templateName: 'AI Generated',
        platform: requestedFormat.format,
        tone: transcription.tone,
        sampleData: {},
        createdAt: transcription.createdAt,
        updatedAt: transcription.createdAt,
        createdBy: transcription.userId || 'anonymous',
        metadata: {
          wordCount: requestedFormat.content.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: requestedFormat.content.length,
          placeholdersUsed: [],
          source: requestedFormat.source,
          latencyMs: requestedFormat.latencyMs
        },
        estimatedReadTime: Math.max(1, Math.ceil(requestedFormat.content.split(/\s+/).length / 200)),
        transcriptionId: transcription._id,
        allFormats: transcription.formats?.filter(f => f.content) || []
      };

      return res.status(200).json({
        success: true,
        data: enhancedContent,
        message: "Content retrieved successfully"
      });
    }

    // Return all successful formats for this transcription
    const successfulFormats = transcription.formats?.filter(f => f.content && !f.error) || [];
    
    const allContents = successfulFormats.map(format => ({
      _id: `${transcription._id}_${format.format}`,
      originalContent: transcription.transcript,
      repurposedContent: format.content,
      templateId: null,
      templateName: 'AI Generated',
      platform: format.format,
      tone: transcription.tone,
      sampleData: {},
      createdAt: transcription.createdAt,
      updatedAt: transcription.createdAt,
      createdBy: transcription.userId || 'anonymous',
      metadata: {
        wordCount: format.content.split(/\s+/).filter(w => w.length > 0).length,
        characterCount: format.content.length,
        placeholdersUsed: [],
        source: format.source,
        latencyMs: format.latencyMs
      },
      estimatedReadTime: Math.max(1, Math.ceil(format.content.split(/\s+/).length / 200))
    }));

    res.status(200).json({
      success: true,
      data: allContents,
      message: "All formats retrieved successfully"
    });

  } catch (error) {
    handleTemplateError(error, res, "content fetch");
  }
};

// Delete transcription record
export const deleteContentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id?.trim()) {
      throw createValidationError("id", "Content ID is required");
    }

    // Handle composite ID or regular transcription ID
    const [transcriptionId] = id.includes('_') ? id.split('_') : [id];

    const transcription = await transcribeModel.findById(transcriptionId);

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: "Content not found"
      });
    }

    // Add user check if you have user field
    // if (transcription.userId !== req.user?.id) {
    //   return res.status(403).json({
    //     success: false,
    //     error: "Access denied"
    //   });
    // }

    await transcribeModel.findByIdAndDelete(transcriptionId);

    res.status(200).json({
      success: true,
      message: "Content deleted successfully",
      data: {
        id: transcriptionId,
        formatsDeleted: transcription.formats?.length || 0
      }
    });

  } catch (error) {
    handleTemplateError(error, res, "content deletion");
  }
};

// Get content statistics
export const getContentStats = async (req: AuthRequest, res: Response) => {
  try {
    // Build query based on user (add userId field to your model for proper user filtering)
    const query: any = {};
    if (req.user?.id) {
      query.userId = req.user.id;
    }

    // Get aggregated statistics
    const [
      totalTranscriptions,
      platformStats,
      toneStats,
      recentActivity
    ] = await Promise.all([
      // Total transcriptions
      transcribeModel.countDocuments(query),
      
      // Platform breakdown - aggregate from formats array
      transcribeModel.aggregate([
        { $match: query },
        { $unwind: '$formats' },
        { $match: { 'formats.content': { $exists: true, $ne: null } } },
        { $group: { _id: '$formats.format', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Tone breakdown
      transcribeModel.aggregate([
        { $match: query },
        { $group: { _id: '$tone', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Recent activity (last 30 days)
      transcribeModel.aggregate([
        {
          $match: {
            ...query,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTranscriptions,
        platformStats: platformStats.map(stat => ({
          platform: stat._id,
          count: stat.count
        })),
        toneStats: toneStats.map(stat => ({
          tone: stat._id,
          count: stat.count
        })),
        recentActivity: recentActivity.map(stat => ({
          date: stat._id,
          count: stat.count
        }))
      },
      message: "Statistics retrieved successfully"
    });

  } catch (error) {
    handleTemplateError(error, res, "statistics fetch");
  }
};

// Enhanced transcribe function to include user tracking
export const transcribeWithHistory = async (req: AuthRequest, res: Response) => {
  const { transcript, platforms, tone, templateId, templateData} = req.body;

  // Your existing validation logic here...
  if (!transcript || !platforms || !tone) {
    return res.status(400).json({
      error: "Missing required fields: transcript, platforms, or tone",
    });
  }

  // ... rest of your validation

  try {
    const results: any = [];

    // Your existing content generation logic...
    for (const fmt of Array.isArray(platforms) ? platforms : [platforms]) {
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

    // Enhanced save to DB with user tracking
    const successful = results.filter(r => r.content);
    if (successful.length > 0) {
      try {
        await transcribeModel.create({
          transcript,
          tone,
          formats: results, // Save all results, including failures
          userId: req.user?.id, // Add user tracking
          metadata: {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          },
          createdAt: new Date(),
        });
      } catch (dbErr: any) {
        console.error("Database save error:", dbErr);
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
