const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Otp",
  new mongoose.Schema(
    {
      phone: { type: String, required: true, index: true },
      codeHash: { type: String, required: true },
      expiresAt: { type: Date, required: true, index: { expires: 0 } },
      attempts: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);
