import { Request, Response } from "express";
import argon from "argon2";
import { generateToken } from "../../utils/generateToken";
import { userModel } from "../../models/user";

export const register = async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const userExists = await userModel.findOne({ email });
  if (userExists)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await argon.hash(password);
  const user = await userModel.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
  });
  const token = generateToken(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      token,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user || !(await argon.verify(password, user.password))) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = generateToken(user._id.toString());
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      token,
    },
  });
};

export const me = async (req: Request, res: Response) => {
  res.json((req as any).user);
};
