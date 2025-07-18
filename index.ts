import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth/index";
import transcribeRoutes from "./routes/transcribe/index";

dotenv.config();

const app = express();

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGODB_URL!;

if (!MONGO_URL) {
  console.error("FATAL ERROR: MONGODB_URL is not defined.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World! Backend is running...");
});
app.use("/api/auth", authRoutes);
app.use("/api", transcribeRoutes);

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Mongo error:", err));

if (process.env.NODE_ENV === "development") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
