import User from "../models/Users.js";
import mailer from "../utils/mailer.js";
import fs from "fs";
import path from "path";
import mailConfig from "../config/mailConfig.js";
import moment from "moment-timezone";

function renderTemplate(templateName, vars = {}) {
    const file = path.join(process.cwd(), "utils", "mailTemplates", templateName);
    if (!fs.existsSync(file)) return Object.values(vars).join(" ");
    let tpl = fs.readFileSync(file, "utf8");
    Object.keys(vars).forEach((k) => {
        const re = new RegExp(`{{\\s*${k}\\s*}}`, "g");
        tpl = tpl.replace(re, vars[k]);
    });
    return tpl;
}

export const sendLeaveAppliedNotification = async (leave, totalDays) => {
    const user = await User.findById(leave.userId).select("name email mobile");

    const admins = await User.find({
        role: { $regex: /^admin$/i },
        email: { $exists: true, $ne: "" },
    }).select("name email");

    const hrs = await User.find({
        role: { $regex: /^hr$/i },
        email: { $exists: true, $ne: "" },
    }).select("name email");

    const adminEmails = admins.map(a => a.email);
    const hrEmails = hrs.map(h => h.email);

    if (hrEmails.length === 0 && adminEmails.length === 0) {
        console.warn("No HR/Admin emails found");
        return;
    }

    const recipients = [
        ...hrs.map(h => ({
            name: h.name,
            email: h.email,
            role: "HR"
        })),
        ...admins.map(a => ({
            name: a.name,
            email: a.email,
            role: "Admin"
        }))
    ];

    const leaveDates = (leave.leaveDays || []).map((d) => new Date(d.date).toDateString()).join(", ");
    const html = renderTemplate("leaveApplied.html", {
        userName: user?.name || "Employee",
        userEmail: user?.email || "",
        mobile: user?.mobile || "",
        leaveDates,
        reason: leave.reason || "",
        totalDays: totalDays || "",
        recipientsHtml: recipients.map(r => `
                <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.role}</td>
                </tr>
            `).join("")
    });

    await mailer.sendMail({
        replyTo: user?.email,
        to: hrEmails,
        cc: adminEmails,
        subject: `Leave Applied: ${user?.name || "Employee"}`,
        html,
    });
};

export const sendLeaveAppliedSelfNotification = async (leave, totalDays) => {
    const user = await User.findById(leave.userId)
        .select("name email mobile");

    if (!user?.email) return;

    const admins = await User.find({
        role: { $regex: /^admin$/i },
        email: { $exists: true, $ne: "" },
    }).select("name email role");

    const hrs = await User.find({
        role: { $regex: /^hr$/i },
        email: { $exists: true, $ne: "" },
    }).select("name email role");

    const adminEmails = admins.map(a => a.email);
    const hrEmails = hrs.map(h => h.email);

    if (hrEmails.length === 0 && adminEmails.length === 0) {
        console.warn("No HR/Admin emails found");
        return;
    }

    const leaveDates = (leave.leaveDays || [])
        .map((d) => new Date(d.date).toDateString())
        .join(", ");

    const recipients = [
        ...hrs.map(h => ({
            name: h.name,
            email: h.email,
            role: "HR"
        })),
        ...admins.map(a => ({
            name: a.name,
            email: a.email,
            role: "Admin"
        }))
    ];

    const html = renderTemplate(
        "leaveAppliedSelf.html",
        {
            userName: user.name,
            leaveDates,
            reason: leave.reason,
            totalDays: totalDays,
            recipientsHtml: recipients.map(r => `
                <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.role}</td>
                </tr>
            `).join("")
        }
    );

    await mailer.sendMail({
        from: `"HRMS Portal" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Leave Application Submitted Successfully",
        html,
    });
};

export const sendRegularizationNotification = async (regularization) => {
    try {
        const user = await User.findById(regularization.userId).select(
            "name email mobile employeeId department designation"
        );

        if (!user) return;

        const admins = await User.find({
            role: { $regex: /^admin$/i },
            email: { $exists: true, $ne: "" },
        }).select("name email");

        const hrs = await User.find({
            role: { $regex: /^hr$/i },
            email: { $exists: true, $ne: "" },
        }).select("name email");

        const hrEmails = hrs.map((x) => x.email);
        const adminEmails = admins.map((x) => x.email);

        if (!hrEmails.length && !adminEmails.length) {
            console.warn("No HR/Admin found to notify.");
            return;
        }

        const recipients = [
            ...hrs.map((x) => ({
                name: x.name,
                email: x.email,
                role: "HR",
            })),
            ...admins.map((x) => ({
                name: x.name,
                email: x.email,
                role: "Admin",
            })),
        ];

        const html = renderTemplate("regularizationApplied.html", {
            userName: user.name,
            userEmail: user.email,
            mobile: user.mobile || "-",
            employeeId: user.employeeId || "-",
            department: user.department || "-",
            designation: user.designation || "-",

            attendanceDate: moment(regularization.attendanceDate).format(
                "DD MMM YYYY"
            ),

            requestType: regularization.requestType,

            currentPunchIn: regularization.currentPunchIn
                ? moment(regularization.currentPunchIn).format("hh:mm A")
                : "-",

            currentPunchOut: regularization.currentPunchOut
                ? moment(regularization.currentPunchOut).format("hh:mm A")
                : "-",

            requestedPunchIn: moment(
                regularization.requestedPunchIn
            ).format("hh:mm A"),

            requestedPunchOut: moment(
                regularization.requestedPunchOut
            ).format("hh:mm A"),

            reason: regularization.reason,

            recipientsHtml: recipients
                .map(
                    (r) => `
            <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.role}</td>
            </tr>
        `
                )
                .join(""),
        });

        await mailer.sendMail({
            replyTo: user.email,
            to: hrEmails,
            cc: adminEmails,
            subject: `Regularization Request - ${user.name}`,
            html,
        });
    } catch (err) {
        console.error("Regularization Notification Error:", err);
    }
};

export const sendRegularizationSelfNotification = async (regularization) => {
    try {
        const user = await User.findById(regularization.userId).select(
            "name email mobile employeeId department designation"
        );

        if (!user?.email) return;

        const admins = await User.find({
            role: { $regex: /^admin$/i },
            email: { $exists: true, $ne: "" },
        }).select("name email");

        const hrs = await User.find({
            role: { $regex: /^hr$/i },
            email: { $exists: true, $ne: "" },
        }).select("name email");

        const hrEmails = hrs.map((x) => x.email);
        const adminEmails = admins.map((x) => x.email);

        if (!hrEmails.length && !adminEmails.length) {
            console.warn("No HR/Admin found to notify.");
            return;
        }

        const recipients = [
            ...hrs.map((x) => ({
                name: x.name,
                email: x.email,
                role: "HR",
            })),
            ...admins.map((x) => ({
                name: x.name,
                email: x.email,
                role: "Admin",
            })),
        ];

        const html = renderTemplate(
            "regularizationAppliedSelf.html",
            {
                userName: user.name,
                userEmail: user.email,
                employeeId: user.employeeId || "-",
                department: user.department || "-",
                designation: user.designation || "-",

                attendanceDate: moment(
                    regularization.attendanceDate
                ).format("DD MMM YYYY"),

                requestType: regularization.requestType,

                currentPunchIn: regularization.currentPunchIn
                    ? moment(regularization.currentPunchIn).format("hh:mm A")
                    : "-",

                currentPunchOut: regularization.currentPunchOut
                    ? moment(regularization.currentPunchOut).format("hh:mm A")
                    : "-",

                requestedPunchIn: moment(
                    regularization.requestedPunchIn
                ).format("hh:mm A"),

                requestedPunchOut: moment(
                    regularization.requestedPunchOut
                ).format("hh:mm A"),

                reason: regularization.reason,

                recipientsHtml: recipients
                    .map(
                        (r) => `
            <tr>
                <td>${r.name}</td>
                <td>${r.email}</td>
                <td>${r.role}</td>
            </tr>
        `
                    )
                    .join(""),
            }
        );

        await mailer.sendMail({
            from: `"HRMS Portal" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Regularization Request Submitted",
            html,
        });
    } catch (err) {
        console.error("Regularization Self Notification Error:", err);
    }
};

export const sendBroadcast = async ({ adminId, subject, message, userIds }) => {
    let users;
    if (Array.isArray(userIds) && userIds.length) {
        users = await User.find({ _id: { $in: userIds } }).select("email name");
    } else {
        users = await User.find({}).select("email name");
    }
    const emails = users.map((u) => u.email).filter(Boolean);
    if (emails.length === 0) throw new Error("No recipient emails found");

    const admin = adminId ? await User.findById(adminId).select("name") : null;
    const html = renderTemplate("broadcast.html", {
        subject,
        message,
        adminName: admin?.name || "Admin",
    });

    await mailer.sendMail({
        bcc: emails.join(","),
        subject,
        html,
    });
};

export default { sendLeaveAppliedNotification, sendLeaveAppliedSelfNotification, sendRegularizationNotification, sendRegularizationSelfNotification, sendBroadcast };
