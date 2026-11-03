const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Profile = require("../models/Profile");
const { ok } = require("../utils/token");
router.use(protect);
router.get("/me", async (req, res) => {
  const p = await Profile.findOne({ user: req.user.id });
  if (!p)
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  ok(res, {
    profile: p,
    format: "pdf",
    message:
      "Connect a PDF renderer/storage provider to generate the downloadable PDF",
  });
});
router.get("/:profileId", async (req, res) => {
  const p = await Profile.findById(req.params.profileId).select(
    "-verification",
  );
  if (!p)
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  ok(res, {
    profile: p,
    format: "pdf",
    message:
      "Connect a PDF renderer/storage provider to generate the downloadable PDF",
  });
});
router.post("/download", (req, res) =>
  res
    .status(501)
    .json({
      success: false,
      message: "PDF generation adapter is not configured",
    }),
);
module.exports = router;
