import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html,
        });
    }
    catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send email');
    }
};
export const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const subject = 'Verify Your Email - Ecocash Investment';
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Welcome to Ecocash Investment Platform</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Verify Email</a>
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser: ${verificationUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
    </div>
  `;
    await sendEmail(email, subject, html);
};
export const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = 'Reset Your Password - Ecocash Investment';
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Password Reset Request</h2>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Reset Password</a>
      <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link: ${resetUrl}</p>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
    </div>
  `;
    await sendEmail(email, subject, html);
};
export const sendProfitUpdateEmail = async (email, investmentId, currentBalance, profitPercentage) => {
    const subject = 'Investment Updated - Ecocash Investment';
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Investment Update</h2>
      <p>Your investment <strong>${investmentId}</strong> has been updated.</p>
      <div style="background-color: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p><strong>Current Balance:</strong> ${currentBalance} USD</p>
        <p><strong>Profit:</strong> +${profitPercentage}%</p>
      </div>
      <p>Log in to your dashboard to view details.</p>
    </div>
  `;
    await sendEmail(email, subject, html);
};
