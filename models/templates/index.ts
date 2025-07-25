import mongoose, { Schema, Document, Types } from "mongoose";

interface ITemplate extends Document {
  name: string;
  content: string;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

const templateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const templateModel = mongoose.model<ITemplate>(
  "Template",
  templateSchema
);
