const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { sendNotificationToUser } = require("../services/notification.service");
router.use(protect);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "userId required" });
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId], $size: 2 },
    });
    if (!chat)
      chat = await Chat.create({ participants: [req.user.id, userId] });
    ok(res, chat, "Conversation ready", 201);
  }),
);
router.get(
  "/",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await Chat.find({ participants: req.user.id })
        .populate("participants", "phone")
        .populate("lastMessage")
        .sort({ updatedAt: -1 }),
    ),
  ),
);
router.get(
  "/:chatId/messages",
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
    });
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    ok(
      res,
      await Message.find({ chat: chat.id })
        .populate("sender", "phone")
        .sort({ createdAt: 1 })
        .limit(200),
    );
  }),
);
router.post(
  "/:chatId/messages",
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
    });
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    if (chat.status === "blocked")
      return res
        .status(403)
        .json({ success: false, message: "Chat has been blocked" });
    const m = await Message.create({
      chat: chat.id,
      sender: req.user.id,
      text: req.body.text,
    });
    chat.lastMessage = m.id;
    await chat.save();
    const populated = await m.populate("sender", "phone");

    const recipientId = chat.participants.find(
      (p) => String(p) !== String(req.user.id),
    );

    const io = req.app.get("io");
    if (io) {
      let broadcast = io.to(`chat:${chat.id}`);
      if (recipientId) {
        broadcast = broadcast.to(`user:${recipientId}`);
      }
      broadcast.emit("chat:message", populated);
    }

    // Send push notification to recipient
    if (recipientId) {
      sendNotificationToUser(recipientId, {
        title: "New Message 💬",
        body: m.text ? String(m.text).slice(0, 100) : "You received a new message",
        data: {
          type: "chat_message",
          chatId: String(chat.id),
          senderId: String(req.user.id),
        },
      }).catch((err) => console.error("FCM chat notification failed:", err.message));
    }

    ok(res, populated, "Message sent", 201);
  }),
);
router.patch(
  "/:chatId/read",
  asyncHandler(async (req, res) => {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
    });
    if (!chat)
      return res
        .status(404)
        .json({ success: false, message: "Chat not found" });
    await Message.updateMany(
      { chat: chat.id, sender: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } },
    );
    req.app.get("io")?.to(`chat:${chat.id}`).emit("chat:read", {
      chatId: chat.id,
      readBy: req.user.id,
    });
    ok(res, null, "Messages marked read");
  }),
);
router.delete(
  "/:chatId",
  asyncHandler(async (req, res) => {
    await Chat.deleteOne({ _id: req.params.chatId, participants: req.user.id });
    ok(res, null, "Conversation deleted");
  }),
);
module.exports = router;
