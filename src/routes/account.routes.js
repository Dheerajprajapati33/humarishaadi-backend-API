const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { ok } = require("../utils/token");
const Profile = require("../models/Profile");
router.use(protect);
router.get("/settings", (req, res) =>
  ok(res, {
    phone: req.user.phone,
    language: req.user.language,
    privacy: req.user.privacy,
    status: req.user.status,
  }),
);
router.patch("/privacy", async (req, res) => {
  req.user.privacy = { ...req.user.privacy, ...req.body };
  await req.user.save();
  ok(res, req.user.privacy);
});
router.patch("/language", async (req, res) => {
  req.user.language = req.body.language;
  await req.user.save();
  ok(res, { language: req.user.language });
});
router.delete("/delete", async (req, res) => {
  req.user.status = "deleted";
  await req.user.save();
  await Profile.deleteOne({ user: req.user.id });
  ok(
    res,
    null,
    "Account deactivated. Define retention/anonymization policy before production.",
  );
});
module.exports = router;
