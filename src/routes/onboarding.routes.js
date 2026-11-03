const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Profile = require("../models/Profile");
const Preference = require("../models/Preference");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
router.use(protect);
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const p = await Profile.findOne({ user: req.user.id });
    ok(res, {
      completed: req.user.onboardingCompleted,
      profileExists: !!p,
      completion: p?.completion || 0,
    });
  }),
);
router.post(
  "/complete",
  asyncHandler(async (req, res) => {
    const p = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: { ...req.body, user: req.user.id } },
      { new: true, upsert: true, runValidators: true },
    );
    await Preference.findOneAndUpdate(
      { user: req.user.id },
      { user: req.user.id },
      { upsert: true },
    );
    req.user.onboardingCompleted = true;
    await req.user.save();
    ok(res, p, "Onboarding saved");
  }),
);
module.exports = router;
