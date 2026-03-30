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

export const sendBookingConfirmationEmail = async (toEmail, booking) => {
  const bookingsUrl = `${config.frontendUrl}/my-bookings`

  const mailOptions = {
    from: `"${config.companyName}" <${config.companyEmail}>`,
    to: toEmail,
    subject: `Test Drive Confirmed — ${booking.carTitle} | SearchAnyCars`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Test Drive Confirmed! 🚗</h2>
        <p>Hi <strong>${booking.name}</strong>,</p>
        <p>Your test drive has been booked successfully. Here are the details:</p>

        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 40%;">Car</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${booking.carTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Date</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${booking.preferredDate || 'To be confirmed'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Time</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${booking.preferredTime || 'To be confirmed'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Location</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${booking.locationPreference === 'home' ? 'Home Test Drive' : 'Visit Hub'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phone</td>
              <td style="padding: 8px 0; color: #333;">${booking.phone}</td>
            </tr>
            ${booking.notes ? `<tr><td style="padding: 8px 0; color: #666;">Notes</td><td style="padding: 8px 0; color: #333;">${booking.notes}</td></tr>` : ''}
          </table>
        </div>

        <p>Our team will call you within <strong>2 hours</strong> to confirm the appointment.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${bookingsUrl}"
             style="background-color: #D4A853; color: #0A0A0F; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View My Bookings
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Need to reschedule? Call us at +91 98765 43210 or reply to this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">&copy; ${config.companyName}</p>
      </div>
    `,
  }

  return transporter.sendMail(mailOptions)
}
