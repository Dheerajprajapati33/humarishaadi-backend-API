const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },
    language: { type: String, default: "hi" },
    onboardingCompleted: { type: Boolean, default: false },
    whatsappConsent: { type: Boolean, default: false },
    fcmTokens: { type: [String], default: [], index: true },
    privacy: {
      showPhone: { type: Boolean, default: false },
      profileVisibility: {
        type: String,
        enum: ["public", "members", "hidden"],
        default: "members",
      },
    },
  },
  { timestamps: true },
);
module.exports = mongoose.model("User", userSchema);
