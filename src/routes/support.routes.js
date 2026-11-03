const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Ticket = require("../models/SupportTicket");
const { ok } = require("../utils/token");
router.get("/faqs", (req, res) =>
  ok(res, [
    {
      category: "profile",
      question: "How do I update my profile?",
      answer: "Open Profile > Edit Profile.",
    },
    {
      category: "payment",
      question: "How can I check payment status?",
      answer: "Open My Subscription.",
    },
  ]),
);
router.post("/tickets", protect, async (req, res) =>
  ok(
    res,
    await Ticket.create({ ...req.body, user: req.user.id }),
    "Support ticket created",
    201,
  ),
);
router.get("/tickets", protect, async (req, res) =>
  ok(res, await Ticket.find({ user: req.user.id }).sort({ createdAt: -1 })),
);
module.exports = router;
