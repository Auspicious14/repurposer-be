import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { userModel } from "../models/user";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) throw new Error();
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ message: "Token invalid or expired" });
  }
};
