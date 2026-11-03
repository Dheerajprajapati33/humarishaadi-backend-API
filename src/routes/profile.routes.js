const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Profile = require("../models/Profile");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");
const { uploadPhoto, uploadDocument } = require("../middleware/upload");
const { uploadBuffer, deleteFile } = require("../config/cloudinary");
router.use(protect);
router.get(
  "/me",
  asyncHandler(async (req, res) =>
    ok(res, await Profile.findOne({ user: req.user.id })),
  ),
);
router.post(
  "/",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: { ...req.body, user: req.user.id } },
        { new: true, upsert: true, runValidators: true },
      ),
      "Profile saved",
      201,
    ),
  ),
);
const fields = [
  "personal",
  "professional",
  "family",
  "astrology",
  "health",
  "about",
  "preferences",
];
for (const field of fields) {
  router.patch(
    "/" + field,
    asyncHandler(async (req, res) => {
      if (field === "preferences") {
        const Preference = require("../models/Preference");
        const payload =
          req.body && req.body.preferences ? req.body.preferences : req.body;
        const p = await Preference.findOneAndUpdate(
          { user: req.user.id },
          { $set: { ...payload, user: req.user.id } },
          { new: true, upsert: true },
        );
        return ok(res, p, "preferences updated");
      }

      let update;
      if (field === "about") {
        const aboutVal =
          req.body?.about !== undefined ? req.body.about : req.body;
        update = {
          about:
            typeof aboutVal === "object" && aboutVal?.about !== undefined
              ? aboutVal.about
              : aboutVal,
        };
      } else if (field === "personal" || field === "professional") {
        update = req.body && req.body[field] ? req.body[field] : req.body;
      } else {
        const payload =
          req.body && req.body[field] ? req.body[field] : req.body;
        update = { [field]: payload };
      }

      const p = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: { ...update, user: req.user.id } },
        { new: true, upsert: true, runValidators: true },
      );
      ok(res, p, field + " updated");
    }),
  );
}
router.get(
  "/verification/status",
  asyncHandler(async (req, res) => {
    const p = await Profile.findOne({ user: req.user.id });
    ok(res, p?.verification || { status: "not_submitted" });
  }),
);
router.patch(
  "/verification",
  asyncHandler(async (req, res) => {
    const p = await Profile.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          "verification.status": "pending",
          "verification.documentUrl": req.body.documentUrl,
        },
      },
      { new: true, upsert: true },
    );
    ok(res, p.verification, "Verification submitted");
  }),
);
// ================= PHOTO MANAGEMENT ROUTES =================

// 1. Upload single photo
router.post(
  "/photos",
  uploadPhoto.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a photo file" });
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: "humarishaadi/profiles",
      transformation: [{ width: 1080, height: 1350, crop: "limit", quality: "auto" }],
    });

    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new Profile({ user: req.user.id, photos: [] });
    }

    const isFirstPhoto = !profile.photos || profile.photos.length === 0;
    const newPhoto = {
      url: result.secure_url,
      publicId: result.public_id,
      isPrimary: isFirstPhoto,
    };

    profile.photos.push(newPhoto);
    await profile.save();

    ok(res, profile.photos, "Photo uploaded successfully", 201);
  }),
);

// 2. Upload multiple photos (up to 5 at once)
router.post(
  "/photos/bulk",
  uploadPhoto.array("photos", 5),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide at least one photo file" });
    }

    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new Profile({ user: req.user.id, photos: [] });
    }

    const uploadPromises = req.files.map((file) =>
      uploadBuffer(file.buffer, {
        folder: "humarishaadi/profiles",
        transformation: [{ width: 1080, height: 1350, crop: "limit", quality: "auto" }],
      }),
    );

    const uploadResults = await Promise.all(uploadPromises);

    uploadResults.forEach((result, idx) => {
      const isFirstPhoto = profile.photos.length === 0 && idx === 0;
      profile.photos.push({
        url: result.secure_url,
        publicId: result.public_id,
        isPrimary: isFirstPhoto,
      });
    });

    await profile.save();
    ok(res, profile.photos, "Photos uploaded successfully", 201);
  }),
);

// 3. Set a photo as Primary (Main Profile Photo / DP)
router.patch(
  "/photos/:photoId/primary",
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const targetPhoto = profile.photos.find(
      (p) => p._id.toString() === req.params.photoId || p.publicId === req.params.photoId,
    );
    if (!targetPhoto) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    profile.photos.forEach((p) => {
      p.isPrimary = p._id.toString() === targetPhoto._id.toString();
    });

    await profile.save();
    ok(res, profile.photos, "Primary photo updated successfully");
  }),
);

// 4. Delete photo
router.delete(
  "/photos/:photoId",
  asyncHandler(async (req, res) => {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const photoIndex = profile.photos.findIndex(
      (p) => p._id.toString() === req.params.photoId || p.publicId === req.params.photoId,
    );

    if (photoIndex === -1) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    const photoToDelete = profile.photos[photoIndex];

    try {
      if (photoToDelete.publicId) {
        await deleteFile(photoToDelete.publicId);
      }
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }

    profile.photos.splice(photoIndex, 1);

    if (photoToDelete.isPrimary && profile.photos.length > 0) {
      profile.photos[0].isPrimary = true;
    }

    await profile.save();
    ok(res, profile.photos, "Photo deleted successfully");
  }),
);

// 5. Upload ID verification document directly to Cloudinary
router.post(
  "/verification/upload",
  uploadDocument.single("document"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please provide a document file (image or PDF)",
      });
    }

    const result = await uploadBuffer(req.file.buffer, {
      folder: "humarishaadi/verification",
    });

    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          "verification.status": "pending",
          "verification.documentUrl": result.secure_url,
          "verification.remarks": "",
        },
      },
      { new: true, upsert: true },
    );

    ok(res, profile.verification, "Verification document uploaded successfully", 201);
  }),
);

router.get(
  "/:profileId",
  asyncHandler(async (req, res) => {
    const p = await Profile.findById(req.params.profileId).populate(
      "user",
      "createdAt",
    );
    if (!p)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    ok(res, p);
  }),
);
module.exports = router;
