import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { AuthUser } from "./auth.service";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private isConsoleBackend() {
    return process.env.EMAIL_MODE === "console" || process.env.EMAIL_BACKEND?.includes("console");
  }

  async sendVerificationCode(user: Pick<AuthUser, "email" | "full_name">, otp: string, isResend = false) {
    const subject = isResend
      ? "Your new Kompra.ph verification code"
      : "Verify your Kompra.ph account";
    const text = [
      `Hello ${user.full_name || user.email},`,
      "",
      `Your verification code is: ${otp}`,
      "",
      "Please enter this code to activate your account.",
    ].join("\n");

    if (this.isConsoleBackend()) {
      console.log("----- Kompra.ph verification email -----");
      console.log(`To: ${user.email}`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log("----------------------------------------");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT || 587),
      secure: false,
      auth: {
        user: process.env.EMAIL_HOST_USER || "",
        pass: process.env.EMAIL_HOST_PASSWORD || "",
      },
    });

    await transporter.sendMail({
      from: process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
      to: user.email,
      subject,
      text,
    });
  }

  queueVerificationCode(user: Pick<AuthUser, "email" | "full_name">, otp: string, isResend = false) {
    setImmediate(() => {
      this.sendVerificationCode(user, otp, isResend).catch((error) => {
        this.logger.error(`Verification email failed for ${user.email}`, error?.stack || String(error));
      });
    });
  }

  appendDevOtp<T extends Record<string, unknown>>(payload: T, otp: string) {
    if (this.isConsoleBackend()) {
      return { ...payload, dev_otp: otp };
    }
    return payload;
  }
}
