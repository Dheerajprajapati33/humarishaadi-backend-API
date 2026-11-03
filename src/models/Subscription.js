const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Subscription",
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      planId: String,
      amount: Number,
      currency: { type: String, default: "INR" },
      status: {
        type: String,
        enum: ["pending", "active", "expired", "cancelled", "failed"],
        default: "pending",
      },
      provider: String,
      providerOrderId: String,
      providerPaymentId: String,
      startAt: Date,
      endAt: Date,
    },
    { timestamps: true },
  ),
);
