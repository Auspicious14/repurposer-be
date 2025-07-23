import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

export const sendEmail = async (
  email: any,
  subject: any,
  html?: any,
  text?: string
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      secure: true,
      service: "gmail",
      // requireTLS: true,
      // port: 456,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD, // naturally, replace both with your real credentials or an application-specific password
      },
    });

    const options = () => {
      return {
        from: `Auspicious: <${process.env.EMAIL_USERNAME}>`,
        bcc: email,
        subject,
        text,
        html,
      };
    };

    // Send email
    return await transporter.sendMail(options());
  } catch (error) {
    return error;
  }
};
