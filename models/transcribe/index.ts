import mongoose from "mongoose";

export interface IFormat extends mongoose.Types.Subdocument {
  format: string;
  content: string;
  source: string;
  latencyMs?: number;
  error?: string;
}

export interface ITranscribe extends mongoose.Document {
  transcript: string;
  tone: string;
  formats: mongoose.Types.DocumentArray<IFormat>;
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
  createdAt: Date;
}

const FormatSchema = new mongoose.Schema({
  format: { type: String, required: true },
  content: { type: String, required: true },
  source: { type: String, required: true },
});

const transcribeSchema = new mongoose.Schema({
  transcript: { type: String, required: true },
  tone: { type: String, required: true },
  formats: [FormatSchema],
  createdAt: { type: Date, default: Date.now },
});

export const transcribeModel = mongoose.model("transcribe", transcribeSchema);
