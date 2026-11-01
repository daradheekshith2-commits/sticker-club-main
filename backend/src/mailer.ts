import nodemailer from 'nodemailer';

export interface MailerConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  frontendOrigin: string;
  nodeEnv: string;
}

export function createMailer(config: MailerConfig) {
  const isConfigured = Boolean(config.host);

  const transporter = isConfigured
    ? nodemailer.createTransport({
        host: config.host,
        port: config.port ?? 587,
        secure: config.secure ?? false,
        auth:
          config.user && config.pass
            ? {
                user: config.user,
                pass: config.pass,
              }
            : undefined,
      })
    : null;

  const defaultFrom = config.from || 'Sticker Club <hello@stickerclub.in>';

  async function sendPasswordResetEmail(email: string, rawToken: string): Promise<boolean> {
    const resetUrl = `${config.frontendOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;

    if (!transporter) {
      if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
        console.log(`[LOCAL DEV MAIL] Password reset token for ${email}: ${rawToken}`);
        console.log(`[LOCAL DEV MAIL] Direct reset link: ${resetUrl}`);
      } else {
        console.warn(
          `[MAILER CONFIG WARNING] SMTP_HOST is not configured in production. Password reset email to ${email} was NOT delivered.`
        );
      }
      return false;
    }

    try {
      await transporter.sendMail({
        from: defaultFrom,
        to: email,
        subject: 'Reset your Sticker Club password',
        text: `Hi,\n\nYou requested a password reset for your Sticker Club account. Follow this link to choose a new password:\n\n${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, you can safely ignore this email.\n\n— Sticker Club Hyderabad`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; border: 1px solid #14231D; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #121212; margin-top: 0;">Reset your password</h2>
            <p style="color: #4A4A4A; line-height: 1.5;">You requested a password reset for your Sticker Club account. Click the button below to choose a new password:</p>
            <div style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #101312; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #7A7A7A; font-size: 13px;">This link will expire in 15 minutes. If you did not request this password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E5E5E5; margin: 20px 0;" />
            <p style="color: #999999; font-size: 11px;">Sticker Club · Hyderabad, Telangana</p>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error(`[MAILER ERROR] Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  async function sendOrderConfirmationEmail(order: {
    id: string;
    total: string;
    customerEmail: string;
    customerName: string;
    itemsCount: number;
    paymentMethod: string;
  }): Promise<boolean> {
    if (!transporter) return false;

    try {
      await transporter.sendMail({
        from: defaultFrom,
        to: order.customerEmail,
        subject: `Your Sticker Club Order #${order.id.slice(-8).toUpperCase()}`,
        text: `Hi ${order.customerName},\n\nThank you for your order (#${order.id})! Total: ₹${order.total} via ${order.paymentMethod}.\n\nTrack your order in your account: ${config.frontendOrigin}/account\n\n— Sticker Club`,
      });
      return true;
    } catch (error) {
      console.error(`[MAILER ERROR] Failed to send order confirmation to ${order.customerEmail}:`, error);
      return false;
    }
  }

  return {
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    isConfigured,
  };
}

