import express from "express";
import { register, login, me } from "../../contollers/auth";
import { protect } from "../../middlewares/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);

export default router;
