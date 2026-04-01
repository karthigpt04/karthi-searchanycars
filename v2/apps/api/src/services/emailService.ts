import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
  return transporter;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(
      "[email] SMTP not configured — skipping password reset email to",
      toEmail
    );
    console.warn("[email] Reset token:", resetToken);
    return;
  }

  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

  await t.sendMail({
    from: `"${config.companyName}" <${config.companyEmail}>`,
    to: toEmail,
    subject: "Password Reset - SearchAnyCars",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your SearchAnyCars account.</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 14px;">Or copy and paste this link: <br/>${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">&copy; ${config.companyName}</p>
      </div>
    `,
  });
}

export async function sendBookingConfirmationEmail(
  toEmail: string,
  booking: {
    name: string;
    carTitle: string;
    preferredDate?: string;
    preferredTime?: string;
    locationPreference?: string;
    phone: string;
    notes?: string;
  }
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn(
      "[email] SMTP not configured — skipping booking confirmation email to",
      toEmail
    );
    return;
  }

  const bookingsUrl = `${config.frontendUrl}/my-bookings`;

  await t.sendMail({
    from: `"${config.companyName}" <${config.companyEmail}>`,
    to: toEmail,
    subject: `Test Drive Confirmed — ${booking.carTitle} | SearchAnyCars`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Test Drive Confirmed!</h2>
        <p>Hi <strong>${booking.name}</strong>,</p>
        <p>Your test drive has been booked successfully.</p>
        <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Car:</strong> ${booking.carTitle}</p>
          <p><strong>Date:</strong> ${booking.preferredDate || "To be confirmed"}</p>
          <p><strong>Time:</strong> ${booking.preferredTime || "To be confirmed"}</p>
          <p><strong>Location:</strong> ${booking.locationPreference === "home" ? "Home Test Drive" : "Visit Hub"}</p>
        </div>
        <p>Our team will call you within <strong>2 hours</strong> to confirm.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${bookingsUrl}"
             style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            View My Bookings
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">&copy; ${config.companyName}</p>
      </div>
    `,
  });
}
