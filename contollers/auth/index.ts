import argon from "argon2";
import { Request, Response } from "express";
import { generateToken } from "../../utils/generateToken";
import { userModel } from "../../models/user";
import { IUser } from "../../models/user";
import { generateOTP } from "../../utils/generateOtp";
import { sendEmail } from "../../middlewares/email";
import { emailTemplate } from "../../utils/emailTemplate";

interface AuthRequest extends Request {
  user?: IUser;
}

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
  if (!user || !(await argon.verify(user.password as string, password))) {
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

export const me = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
};

export const forgetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const user: any = await userModel.findOne({ email });
    if (!user)
      return res.json({
        success: false,
        message: "Account with the email does not exist",
      });
    const { resetToken, resetTokenExpiration } = generateOTP();
    user.resetToken = resetToken;
    user.resetTokenExpiration = resetTokenExpiration * 60 * 60 * 1000;
    await user.save();
    const resetLink = `${process.env.APP_URL}/reset?token=${resetToken}`;
    const message = emailTemplate(user, resetLink);
    sendEmail(user.email, "Requesting Password Reset", message);

    res.json({
      success: true,
      message: `Check your mail for your reset link`,
    });
  } catch (error) {
    res.json({ error });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;

  try {
    const user: any = await userModel.findOne({ resetToken });
    if (!user || new Date() > user.resetTokenExpiration)
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });

    const oldPassword = user.password;
    const comparePassword = await argon.verify(oldPassword, newPassword);

    if (comparePassword)
      return res.status(409).json({
        success: false,
        message: "You entered your old password",
      });

    const hashedPassword = await argon.hash(newPassword);
    user.password = hashedPassword;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password successfully changed.",
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};
