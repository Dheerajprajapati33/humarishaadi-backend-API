const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { sendNotificationToUser, sendPushNotification } = require("../services/notification.service");
const { isFirebaseReady } = require("../config/firebase");

// WhatsApp consent
router.patch(
  "/whatsapp-consent",
  protect,
  asyncHandler(async (req, res) => {
    req.user.whatsappConsent = !!req.body.consent;
    await req.user.save();
    ok(res, { whatsappConsent: req.user.whatsappConsent }, "Consent saved");
  }),
);

// Register FCM Device Token
router.post(
  "/device-token",
  protect,
  asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.deviceToken || req.body.fcmToken;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Device token is required (field: token, deviceToken, or fcmToken)",
      });
    }

    const trimmedToken = token.trim();

    // Persist token in user document (avoiding duplicates)
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { fcmTokens: trimmedToken },
    });

    ok(
      res,
      {
        registered: true,
        firebaseConnected: isFirebaseReady(),
        token: trimmedToken,
      },
      "Device token registered successfully",
    );
  }),
);

// Remove FCM Device Token (e.g. on user logout)
router.delete(
  "/device-token",
  protect,
  asyncHandler(async (req, res) => {
    const token = req.body.token || req.body.deviceToken || req.body.fcmToken;

    if (token) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: token.trim() },
      });
    } else {
      // Clear all tokens for this user if no specific token passed
      await User.findByIdAndUpdate(req.user.id, {
        $set: { fcmTokens: [] },
      });
    }

    ok(res, null, "Device token removed");
  }),
);

// Test Notification Endpoint (Sends test FCM to current logged in user)
router.post(
  "/send-test",
  protect,
  asyncHandler(async (req, res) => {
    const { title, body, token } = req.body;

    let result;
    if (token) {
      result = await sendPushNotification({
        tokens: [token],
        title: title || "Test Notification 🔔",
        body: body || "Firebase Push Notification is working perfectly!",
        data: { type: "test", timestamp: Date.now().toString() },
      });
    } else {
      result = await sendNotificationToUser(req.user.id, {
        title: title || "Test Notification 🔔",
        body: body || "Firebase Push Notification is working perfectly!",
        data: { type: "test", timestamp: Date.now().toString() },
      });
    }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || result.message || "Failed to send notification",
        result,
      });
    }

    ok(res, result, "Test notification dispatched");
  }),
);

module.exports = router;
