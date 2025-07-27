import { Router } from "express";
import {
  getTemplate,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../contollers/templates";
import { authenticate } from "../../middlewares/auth";

const router = Router();

router.get("/", authenticate, getTemplates);
router.get("/:id", authenticate, getTemplate as any);
router.post("/", authenticate, createTemplate as any);
router.put("/:id", authenticate, updateTemplate as any);
router.delete("/:id", authenticate, deleteTemplate as any);

export default router;
