import express from "express";
import { authenticate } from "../../middlewares/auth";
import { transcribe } from "../../contollers/transcribe";

const router = express.Router();

router.post("/transcribe", authenticate, transcribe);

export default router;
