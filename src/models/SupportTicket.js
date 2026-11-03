const mongoose = require("mongoose");
module.exports = mongoose.model(
  "SupportTicket",
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      subject: String,
      category: String,
      message: String,
      status: {
        type: String,
        enum: ["open", "in_progress", "resolved", "closed"],
        default: "open",
      },
      adminReply: String,
    },
    { timestamps: true },
  ),
);
