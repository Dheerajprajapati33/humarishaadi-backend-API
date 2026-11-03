const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Interaction = require("../models/Interaction");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { sendNotificationToUser } = require("../services/notification.service");
router.use(protect);
async function add(type, req, res) {
  if (String(req.user.id) === req.params.profileId)
    return res
      .status(400)
      .json({ success: false, message: "Cannot interact with own profile" });
  const row = await Interaction.findOneAndUpdate(
    { from: req.user.id, to: req.params.profileId, type },
    { $setOnInsert: { from: req.user.id, to: req.params.profileId, type } },
    { new: true, upsert: true },
  );

  // Send push notification to target user
  const titles = {
    like: "New Interest Received 💕",
    shortlist: "Profile Shortlisted ⭐",
    contact: "Contact Request Received 📱",
  };
  const bodies = {
    like: "Someone showed interest in your profile! Check them out now.",
    shortlist: "A member shortlisted your profile.",
    contact: "A member requested your contact details.",
  };

  sendNotificationToUser(req.params.profileId, {
    title: titles[type] || "New Activity 🔔",
    body: bodies[type] || `Someone performed an action on your profile.`,
    data: {
      type: `interaction_${type}`,
      fromUserId: String(req.user.id),
    },
  }).catch((err) => console.error("FCM interaction notification failed:", err.message));

  ok(res, row, type + " saved");
}
router.post("/like/:profileId", (req, res) => add("like", req, res));
router.post("/shortlist/:profileId", (req, res) => add("shortlist", req, res));
router.post("/contact/:profileId", (req, res) => add("contact", req, res));
for (const type of ["like", "shortlist", "contact"]) {
  router.delete(
    "/" + type + "/:profileId",
    asyncHandler(async (req, res) => {
      await Interaction.deleteOne({
        from: req.user.id,
        to: req.params.profileId,
        type,
      });
      ok(res, null, type + " removed");
    }),
  );
  router.get(
    "/" +
      (type === "like"
        ? "sent-likes"
        : type === "shortlist"
          ? "shortlist"
          : "contacts"),
    asyncHandler(async (req, res) =>
      ok(
        res,
        await Interaction.find({ from: req.user.id, type })
          .populate("to", "phone")
          .sort({ createdAt: -1 }),
      ),
    ),
  );
}
router.get(
  "/received-likes",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await Interaction.find({ to: req.user.id, type: "like" }).populate(
        "from",
        "phone",
      ),
    ),
  ),
);
router.get(
  "/views",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await Interaction.find({ to: req.user.id, type: "view" }).populate(
        "from",
        "phone",
      ),
    ),
  ),
);
router.get(
  "/matches",
  asyncHandler(async (req, res) => {
    const sent = await Interaction.find({
      from: req.user.id,
      type: "like",
    }).distinct("to");
    const mutual = await Interaction.find({
      from: { $in: sent },
      to: req.user.id,
      type: "like",
    }).populate("from", "phone");
    ok(res, mutual);
  }),
);
module.exports = router;
