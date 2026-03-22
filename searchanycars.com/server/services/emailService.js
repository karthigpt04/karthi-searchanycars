import nodemailer from 'nodemailer'
import config from '../config.js'

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
})

export const sendPasswordResetEmail = async (toEmail, resetToken) => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`

  const mailOptions = {
    from: `"${config.companyName}" <${config.companyEmail}>`,
    to: toEmail,
    subject: 'Password Reset - SearchAnyCars',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your SearchAnyCars account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #e85d4a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link: <br/>${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">&copy; ${config.companyName}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
