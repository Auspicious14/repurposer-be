export const emailTemplate = (user: any, resetLink: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - Forma</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <img src="https://yourdomain.com/logo.png" alt="Forma Logo" width="150" style="display: block;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 0 20px 20px;">
        <h1 style="color: #4f46e5; font-size: 24px; margin: 0 0 10px; font-weight: bold;">Password Reset Request</h1>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin: 0 0 20px;">
          Hello ${user.lastName},<br /><br />
          We received a request to reset your password for your Forma account. Click the button below to set a new password. This link will expire in 1 hour for your security.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 6px; transition: background-color 0.3s;">
                Reset Your Password
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #4b5563; font-size: 14px; margin: 20px 0 0; line-height: 1.5;">
          If you didn’t request this, please ignore this email or contact support at <a href="mailto:support@forma.com" style="color: #ec4899; text-decoration: none;">support@forma.com</a>.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px; background-color: #f3f4f6; color: #6b7280; font-size: 12px;">
        &copy; 2025 Forma. All rights reserved.<br />
        <a href="#" style="color: #ec4899; text-decoration: none;">Unsubscribe</a>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};
