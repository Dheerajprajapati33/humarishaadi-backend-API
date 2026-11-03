const router = require("express").Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { protect } = require("../middleware/auth");
const Subscription = require("../models/Subscription");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");

const plansCatalog = {
  trial: { name: "Trial", amount: 1, durationDays: 1 },
  monthly: { name: "Monthly", amount: 299, durationDays: 30 },
  quarterly: { name: "Quarterly", amount: 799, durationDays: 90 },
  yearly: { name: "Yearly", amount: 1999, durationDays: 365 }
};

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.SECRET_ID || process.env.KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

// 1. Create Order (POST /api/v1/payments/create-order)
router.post("/create-order", protect, asyncHandler(async (req, res) => {
  const { planId, amount } = req.body;
  if (!planId) return res.status(400).json({ success: false, message: "planId required" });

  const plan = plansCatalog[planId];
  const finalAmount = Number(amount || plan?.amount);
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    return res.status(400).json({ success: false, message: "Valid amount required" });
  }

  const razorpay = getRazorpayInstance();
  const internalReceipt = "HS_" + Date.now() + "_" + req.user.id.slice(-5);

  let providerOrderId = internalReceipt;
  let provider = "razorpay";
  let rzpOrderData = null;

  if (razorpay) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100), // amount in paise
        currency: "INR",
        receipt: internalReceipt,
        notes: {
          userId: req.user.id,
          planId
        }
      });
      providerOrderId = order.id;
      rzpOrderData = order;
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Razorpay order creation failed: " + (err.error?.description || err.message)
      });
    }
  } else {
    // Fallback when keys are not yet configured in .env
    providerOrderId = "rzp_order_mock_" + Date.now();
    provider = "sandbox";
  }

  const sub = await Subscription.create({
    user: req.user.id,
    planId,
    amount: finalAmount,
    currency: "INR",
    provider,
    providerOrderId,
    status: "pending"
  });

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.KEY_ID || null;

  ok(res, {
    subscriptionId: sub._id,
    orderId: providerOrderId,
    amount: finalAmount,
    amountInPaise: Math.round(finalAmount * 100),
    currency: "INR",
    keyId: keyId,
    providerConfigured: !!razorpay,
    provider,
    message: razorpay
      ? "Real Razorpay order created successfully"
      : "Sandbox order created. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env to activate real gateway payments."
  }, "Order created", 201);
}));

// 2. Verify Payment (POST /api/v1/payments/verify)
router.post("/verify", protect, asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  const targetOrderId = razorpay_order_id || orderId;

  if (!targetOrderId) {
    return res.status(400).json({ success: false, message: "orderId or razorpay_order_id required" });
  }

  const sub = await Subscription.findOne({
    user: req.user.id,
    providerOrderId: targetOrderId
  });

  if (!sub) {
    return res.status(404).json({ success: false, message: "Subscription order not found" });
  }

  if (sub.status === "active") {
    return ok(res, sub, "Subscription is already active");
  }

  const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.SECRET_ID || process.env.KEY_SECRET;

  if (key_secret && razorpay_signature && razorpay_payment_id) {
    const generatedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(targetOrderId + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      sub.status = "failed";
      await sub.save();
      return res.status(400).json({ success: false, message: "Payment verification failed: Invalid signature" });
    }
  }

  const plan = plansCatalog[sub.planId] || { durationDays: 30 };
  const now = new Date();
  sub.status = "active";
  sub.providerPaymentId = razorpay_payment_id || ("pay_" + Date.now());
  sub.startAt = now;
  sub.endAt = new Date(now.getTime() + (plan.durationDays || 30) * 86400000);
  await sub.save();

  ok(res, sub, "Payment verified and subscription activated");
}));

// 3. Webhook (POST /api/v1/payments/webhook)
router.post("/webhook", asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || process.env.SECRET_ID;
  const signature = req.headers["x-razorpay-signature"];

  if (webhookSecret && signature) {
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }
  }

  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id || req.body?.payload?.order?.entity?.id;

  if (orderId && (event === "payment.captured" || event === "order.paid")) {
    const sub = await Subscription.findOne({ providerOrderId: orderId });
    if (sub && sub.status !== "active") {
      const plan = plansCatalog[sub.planId] || { durationDays: 30 };
      const now = new Date();
      sub.status = "active";
      sub.providerPaymentId = paymentEntity?.id || sub.providerPaymentId;
      sub.startAt = now;
      sub.endAt = new Date(now.getTime() + (plan.durationDays || 30) * 86400000);
      await sub.save();
    }
  }

  res.json({ success: true, message: "Webhook processed" });
}));

// 4. Status Check (GET /api/v1/payments/status/:orderId)
router.get("/status/:orderId", protect, asyncHandler(async (req, res) => {
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.orderId);
  const query = { user: req.user.id };

  if (isMongoId) {
    query.$or = [{ providerOrderId: req.params.orderId }, { _id: req.params.orderId }];
  } else {
    query.providerOrderId = req.params.orderId;
  }

  const sub = await Subscription.findOne(query);
  if (!sub) return res.status(404).json({ success: false, message: "Subscription not found" });
  ok(res, sub);
}));

module.exports = router;
