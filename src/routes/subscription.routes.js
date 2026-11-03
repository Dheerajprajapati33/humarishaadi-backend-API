const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Subscription = require("../models/Subscription");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");

const plans = [
  { id: "trial", name: "Trial", amount: 1, currency: "INR", durationDays: 1 },
  {
    id: "monthly",
    name: "Monthly",
    amount: 299,
    currency: "INR",
    durationDays: 30,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    amount: 799,
    currency: "INR",
    durationDays: 90,
  },
  {
    id: "yearly",
    name: "Yearly",
    amount: 1999,
    currency: "INR",
    durationDays: 365,
  },
];

router.get("/plans", (req, res) => ok(res, plans));

router.get(
  "/current",
  protect,
  asyncHandler(async (req, res) => {
    const current = await Subscription.findOne({
      user: req.user.id,
      status: "active",
      endAt: { $gt: new Date() },
    }).sort({ endAt: -1 });
    ok(res, current);
  }),
);

router.post(
  "/activate",
  protect,
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Client-side activation requires valid payment verification. Use POST /api/v1/payments/verify with order and payment details.",
      });
    }
    const sub = await Subscription.findOne({
      user: req.user.id,
      providerOrderId: orderId,
    });
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription order not found" });
    if (sub.status === "active")
      return ok(res, sub, "Subscription is already active");

    // In sandbox/testing mode, activate:
    const plan = plans.find((p) => p.id === sub.planId) || { durationDays: 30 };
    const now = new Date();
    sub.status = "active";
    sub.startAt = now;
    sub.endAt = new Date(now.getTime() + (plan.durationDays || 30) * 86400000);
    await sub.save();
    ok(res, sub, "Subscription activated successfully");
  }),
);

router.post(
  "/cancel",
  protect,
  asyncHandler(async (req, res) => {
    await Subscription.updateMany(
      { user: req.user.id, status: "active" },
      { $set: { status: "cancelled" } },
    );
    ok(res, null, "Subscription cancelled");
  }),
);

module.exports = router;
