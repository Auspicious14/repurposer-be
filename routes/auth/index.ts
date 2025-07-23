import express from "express";
import {
  register,
  login,
  me,
  resetPassword,
  forgetPassword,
} from "../../contollers/auth";
import { authenticate } from "../../middlewares/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/reset-password", resetPassword);
router.post("/forget-password", forgetPassword);

export default router;
