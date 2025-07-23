import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Password can be optional for returned user objects
  resetToken?: string;
  resetTokenExpiration?: Date;
}

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: { type: String, required: false },
  resetTokenExpiration: { type: Number, required: false },
});

export const userModel = mongoose.model<IUser>("User", userSchema);
