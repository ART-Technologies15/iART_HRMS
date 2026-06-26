import { sendBroadcast } from "../services/mailService.js";

export const broadcast = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Only admin can broadcast emails" });

    const { subject, message, userIds } = req.body;
    if (!subject || !message)
      return res.status(400).json({ success: false, message: "subject and message are required" });

    await sendBroadcast({ adminId: req.user._id, subject, message, userIds });

    return res.status(200).json({ success: true, message: "Broadcast sent" });
  } catch (err) {
    console.error("Error broadcasting mail", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
