import { Router } from "express";
import {
  getTemplate,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  duplicateTemplate
} from "../../contollers/templates";
import { authenticate } from "../../middlewares/auth";

const router = Router();

router.use(authenticate)

router.post("/", createTemplate as any);
router.get("/", getTemplates as any);
router.get("/:id", getTemplate as any);
router.put("/:id", updateTemplate as any);
router.delete("/:id", deleteTemplate as any);

router.post("/preview", previewTemplate as any);
router.post("/:id/duplicate", duplicateTemplate as any);


export default router;
