import nodemailer from "nodemailer";

export const nodeMailerClient = nodemailer.createTransport({
    host: "smtp.example.com", // 例: smtp.gmail.com
    port: 587,
    secure: false, // TLS
    auth: {
      user: "test@example.com",
      pass: "password",
    },
  });
