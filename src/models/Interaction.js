const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Interaction",
  new mongoose.Schema(
    {
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      type: {
        type: String,
        enum: ["like", "shortlist", "view", "contact"],
        required: true,
      },
      createdAt: { type: Date, default: Date.now },
    },
    { timestamps: false },
  ),
);
