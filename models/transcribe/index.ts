import mongoose from "mongoose";

const transcribeSchema = new mongoose.Schema(
  {
    transcript: {
      type: String,
      required: true,
      trim: true,
    },
    originalTranscript: {
      type: String,
      trim: true,
    },

    tone: {
      type: String,
      required: true,
      enum: [
        "Casual",
        "Professional",
        "Friendly",
        "Formal",
        "Humorous",
        "Persuasive",
        "Informative",
      ],
    },

    formats: [
      {
        format: {
          type: String,
          required: true,
          enum: [
            "Twitter",
            "LinkedIn",
            "Instagram Caption",
            "Blog Summary",
            "Email",
            "Facebook",
            "Thread",
            "Tiktok",
            "Whatsapp",
          ],
        },
        content: {
          type: String,
          default: null,
        },
        source: {
          type: String,
          default: null,
        },
        latencyMs: {
          type: Number,
          default: 0,
        },
        error: {
          type: String,
          default: null,
        },
        success: {
          type: Boolean,
          default: false,
        },
      },
    ],

    templateInfo: {
      templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Template",
      },
      templateName: String,
      templatePlatform: String,
      placeholdersUsed: [String],
      templateData: {
        type: Map,
        of: String,
      },
      originalTemplate: String,
    },

    isTemplateGenerated: {
      type: Boolean,
      default: false,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },

    metadata: {
      ip: String,
      userAgent: String,
      templateProcessed: {
        type: Boolean,
        default: false,
      },
      platformsRequested: {
        type: Number,
        default: 0,
      },
      successfulPlatforms: {
        type: Number,
        default: 0,
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Enhanced indexes for better performance
transcribeSchema.index({ userId: 1, createdAt: -1 });
transcribeSchema.index({ tone: 1 });
transcribeSchema.index({ "formats.format": 1 });
transcribeSchema.index({ isTemplateGenerated: 1 });
transcribeSchema.index({ "templateInfo.templateId": 1 });
transcribeSchema.index({ createdAt: -1 });

export const transcribeModel = mongoose.model("transcribe", transcribeSchema);
