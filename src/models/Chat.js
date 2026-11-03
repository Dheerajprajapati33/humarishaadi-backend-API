const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Chat",
  new mongoose.Schema(
    {
      participants: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      ],
      lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      status: { type: String, enum: ["active", "blocked"], default: "active" },
    },
    { timestamps: true },
  ),
);
