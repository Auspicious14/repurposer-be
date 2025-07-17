import express from "express";
import { authenticate } from "../../middlewares/auth";
import { transribe } from "../../contollers/transcribe";

const router = express.Router();

router.post("/register", authenticate, transribe);

export default router;
