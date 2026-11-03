require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Chat = require("./models/Chat");
const Message = require("./models/Message");
const { sendNotificationToUser } = require("./services/notification.service");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || "*", methods: ["GET", "POST"] },
});
app.set("io", io);

io.use((socket, next) => {
  try {
    let token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token && typeof token === "string" && token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }
    if (!token) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);

  // Join chat room (validates user is a participant)
  socket.on("chat:join", async ({ chatId }, ack) => {
    try {
      if (!chatId) {
        if (ack) ack({ success: false, message: "chatId required" });
        return;
      }
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user.id,
      });
      if (!chat) {
        if (ack)
          ack({ success: false, message: "Chat not found or access denied" });
        return;
      }
      socket.join(`chat:${chatId}`);
      if (ack) ack({ success: true, message: `Joined chat room ${chatId}` });
    } catch (e) {
      if (ack) ack({ success: false, message: e.message });
    }
  });

  // Leave chat room
  socket.on("chat:leave", ({ chatId }) => {
    if (chatId) socket.leave(`chat:${chatId}`);
  });

  // Send message via socket (validates participant, updates lastMessage, broadcasts)
  socket.on("chat:message", async ({ chatId, text }, ack) => {
    try {
      if (!chatId || !text || !String(text).trim()) {
        if (ack)
          ack({ success: false, message: "chatId and text are required" });
        return;
      }
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user.id,
      });
      if (!chat) {
        if (ack)
          ack({ success: false, message: "Chat not found or access denied" });
        return;
      }
      if (chat.status === "blocked") {
        if (ack)
          ack({ success: false, message: "Chat has been blocked" });
        return;
      }
      const msg = await Message.create({
        chat: chatId,
        sender: socket.user.id,
        text: String(text).trim(),
      });
      chat.lastMessage = msg.id;
      await chat.save();
      const populated = await msg.populate("sender", "phone");

      const recipientId = chat.participants.find(
        (p) => String(p) !== String(socket.user.id),
      );

      // Broadcast to chat room AND recipient user room (so chat list / in-app notifications update immediately)
      let broadcast = io.to(`chat:${chatId}`);
      if (recipientId) {
        broadcast = broadcast.to(`user:${recipientId}`);
      }
      broadcast.emit("chat:message", populated);

      // Send push notification to recipient
      if (recipientId) {
        sendNotificationToUser(recipientId, {
          title: "New Message 💬",
          body: text ? String(text).slice(0, 100) : "You received a new message",
          data: {
            type: "chat_message",
            chatId: String(chatId),
            senderId: String(socket.user.id),
          },
        }).catch((err) => console.error("FCM socket message notification failed:", err.message));
      }

      if (ack) ack({ success: true, message: populated });
    } catch (e) {
      if (ack) ack({ success: false, message: e.message });
    }
  });

  // Mark messages as read via socket
  socket.on("chat:read", async ({ chatId }, ack) => {
    try {
      if (!chatId) {
        if (ack) ack({ success: false, message: "chatId required" });
        return;
      }
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user.id,
      });
      if (!chat) {
        if (ack)
          ack({ success: false, message: "Chat not found or access denied" });
        return;
      }
      await Message.updateMany(
        { chat: chatId, sender: { $ne: socket.user.id } },
        { $addToSet: { readBy: socket.user.id } },
      );
      io.to(`chat:${chatId}`).emit("chat:read", {
        chatId,
        readBy: socket.user.id,
      });
      if (ack) ack({ success: true });
    } catch (e) {
      if (ack) ack({ success: false, message: e.message });
    }
  });

  // Typing indicator (validates participant)
  socket.on("chat:typing", async ({ chatId, isTyping }) => {
    try {
      if (!chatId) return;
      const chat = await Chat.findOne({
        _id: chatId,
        participants: socket.user.id,
      });
      if (chat) {
        socket.to(`chat:${chatId}`).emit("chat:typing", {
          userId: socket.user.id,
          isTyping: !!isTyping,
        });
      }
    } catch {}
  });
});

connectDB()
  .then(() => {
    const port = process.env.PORT || 6000;
    server.listen(port, () =>
      console.log(`HumaariShaadi API running on ${port}`),
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
