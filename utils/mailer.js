import nodemailer from "nodemailer";
import mailConfig from "../config/mailConfig.js";

let transporter;

if (mailConfig.provider === "smtp") {
    transporter = nodemailer.createTransport(mailConfig.smtp);
} else {
    transporter = nodemailer.createTransport(mailConfig.smtp);
}

export const sendMail = async ({ replyTo, to, cc, subject, html, text }) => {
    try {
        const info = await transporter.sendMail({
            replyTo,
            from: mailConfig.from,
            to,
            cc,
            subject,
            html,
            text,
        });
        return info;
    } catch (err) {
        console.error("Mail send failed:", err.message);
        throw new Error("Failed to send email");
    }
};

export default { sendMail };
