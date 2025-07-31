import express from "express";
import { authenticate } from "../../middlewares/auth";
import {
  transcribe,
  getContentHistory,
  deleteContentHistory,
  getTemplatesForRepurpose,
  getContentById,
  getContentStats,
} from "../../contollers/transcribe";

const router = express.Router();

router.post("/transcribe", authenticate, transcribe as any);
router.get("/history", authenticate, getContentHistory as any);
router.get("/history/:id", authenticate, getContentById as any);
router.get("/history/stats", authenticate, getContentStats as any);
router.delete("/history/:id", authenticate, deleteContentHistory as any);

export default router;
