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
router.get("/:id", authenticate, getTemplate);
router.post("/", authenticate, createTemplate);
router.put("/:id", authenticate, updateTemplate);
router.delete("/:id", authenticate, deleteTemplate);

export default router
