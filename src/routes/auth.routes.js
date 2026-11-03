const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp");
const User = require("../models/User");
const { signToken, ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { protect } = require("../middleware/auth");
const digits = Number(process.env.OTP_LENGTH || 6);
router.post(
  "/send-otp",
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!/^[0-9]{10,15}$/.test(String(phone || "")))
      return res
        .status(400)
        .json({ success: false, message: "Valid phone number required" });
    const code = String(Math.floor(Math.random() * 10 ** digits)).padStart(
      digits,
      "0",
    );
    await Otp.deleteMany({ phone });
    await Otp.create({
      phone,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(
        Date.now() + Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60000,
      ),
    });
    // Development only: return OTP when OTP_PROVIDER=mock. Connect an SMS provider for production.
    ok(
      res,
      {
        phone,
        expiresInMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
        ...(process.env.OTP_PROVIDER === "mock"
          ? { developmentOtp: code }
          : {}),
      },
      "OTP generated",
    );
  }),
);
router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    const record = await Otp.findOne({ phone }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < Date.now() || record.attempts >= 5)
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or unavailable" });
    record.attempts++;
    if (!(await bcrypt.compare(String(otp || ""), record.codeHash))) {
      await record.save();
      return res.status(400).json({ success: false, message: "Incorrect OTP" });
    }
    await record.deleteOne();
    let user = await User.findOneAndUpdate(
      { phone },
      { phone },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    ok(res, { token: signToken(user.id), user }, "Login successful");
  }),
);
router.post("/resend-otp", (req, res) =>
  res
    .status(501)
    .json({ success: false, message: "Call /send-otp to generate a new OTP" }),
);
router.post("/logout", protect, (req, res) =>
  ok(res, null, "Logged out. Remove the JWT on client."),
);
router.get("/me", protect, (req, res) => ok(res, req.user));
module.exports = router;
