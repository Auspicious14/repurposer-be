const { randomBytes } = require("node:crypto");

export const generateOTP = () => {
  let resetToken: string;
  const resetTokenExpiration = Date.now();
  const randomNumbers = randomBytes(32).toString("hex");
  resetToken = randomNumbers;
  return { resetToken, resetTokenExpiration };
};
