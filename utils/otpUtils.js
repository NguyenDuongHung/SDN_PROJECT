import bcrypt from "bcryptjs/dist/bcrypt.js";
import nodemailer from "nodemailer";

export const generateAndSendOTP = async (user) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = await bcrypt.hash(otp, 10);
    user.OTPExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send OTP via email (configure transporter as needed)
    const transporter = nodemailer.createTransport({
      // Configure your SMTP
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}`,
    });
    return { success: true};
  } catch (error) {
    console.log(error);
    return { success: false, error};
  }
};
