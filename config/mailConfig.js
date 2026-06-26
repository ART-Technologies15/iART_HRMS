const mailConfig = {
  provider: process.env.MAIL_PROVIDER || "smtp",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
    },
    from: process.env.MAIL_FROM
  },
};

export default mailConfig;
