const router = require("express").Router();
const { protect } = require("../middleware/auth");
const Profile = require("../models/Profile");
const Preference = require("../models/Preference");
const { ok } = require("../utils/token");
const asyncHandler = require("../utils/asyncHandler");

router.use(protect);

function parseHeightInCm(val) {
  if (!val) return null;
  if (typeof val === "number") return val;
  const ftIn = String(val).match(/(\d+)\s*(?:ft|')(?:\s*(\d+)\s*(?:in|"))?/i);
  if (ftIn) {
    const feet = parseInt(ftIn[1], 10);
    const inches = ftIn[2] ? parseInt(ftIn[2], 10) : 0;
    return Math.round(feet * 30.48 + inches * 2.54);
  }
  const cmMatch = String(val).match(/(\d+)\s*cm/i);
  if (cmMatch) return parseInt(cmMatch[1], 10);
  const numOnly = parseFloat(val);
  return isNaN(numOnly) ? null : numOnly;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const own = await Profile.findOne({ user: req.user.id });
    if (!own) return ok(res, []);
    const pref = await Preference.findOne({ user: req.user.id });
    const q = { user: { $ne: req.user.id } };

    if (req.query.gender) {
      q.gender = req.query.gender;
    } else if (own?.gender) {
      q.gender = own.gender === "male" ? "female" : "male";
    }

    if (req.query.city) {
      q["city.name"] = new RegExp(req.query.city, "i");
    } else if (pref?.locations?.length) {
      q["city.name"] = { $in: pref.locations };
    }

    if (req.query.state) {
      q["city.state"] = new RegExp(req.query.state, "i");
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 50);
    const skip = (page - 1) * limit;

    const rows = await Profile.find(q)
      .skip(skip)
      .limit(limit)
      .select("-verification");
    ok(res, rows);
  }),
);

router.post(
  "/search",
  asyncHandler(async (req, res) => {
    const q = { user: { $ne: req.user.id } };

    if (req.body.gender) q.gender = req.body.gender;
    if (req.body.religion) q.religion = new RegExp(req.body.religion, "i");
    if (req.body.caste) q.caste = new RegExp(req.body.caste, "i");
    if (req.body.city) q["city.name"] = new RegExp(req.body.city, "i");
    if (req.body.state) q["city.state"] = new RegExp(req.body.state, "i");
    if (req.body.maritalStatus)
      q.maritalStatus = new RegExp(req.body.maritalStatus, "i");
    if (req.body.education) q.education = new RegExp(req.body.education, "i");
    if (req.body.occupation)
      q.occupation = new RegExp(req.body.occupation, "i");

    if (req.body.ageMin || req.body.ageMax) {
      q.dob = {};
      const now = new Date();
      if (req.body.ageMax) {
        const minDob = new Date(
          now.getFullYear() - Number(req.body.ageMax) - 1,
          now.getMonth(),
          now.getDate(),
        );
        q.dob.$gte = minDob;
      }
      if (req.body.ageMin) {
        const maxDob = new Date(
          now.getFullYear() - Number(req.body.ageMin),
          now.getMonth(),
          now.getDate(),
        );
        q.dob.$lte = maxDob;
      }
    }

    const page = Math.max(1, Number(req.body.page || req.query.page) || 1);
    const limit = Math.min(
      Math.max(1, Number(req.body.limit || req.query.limit) || 20),
      50,
    );
    const skip = (page - 1) * limit;

    let rows = await Profile.find(q)
      .skip(skip)
      .limit(limit)
      .select("-verification");

    if (req.body.heightMin || req.body.heightMax) {
      const minH = req.body.heightMin ? Number(req.body.heightMin) : 0;
      const maxH = req.body.heightMax ? Number(req.body.heightMax) : Infinity;
      rows = rows.filter((r) => {
        const cm = parseHeightInCm(r.height);
        return cm === null || (cm >= minH && cm <= maxH);
      });
    }

    ok(res, rows);
  }),
);

router.post("/refresh", (req, res) =>
  ok(res, { refreshedAt: new Date() }, "Recommendations refreshed"),
);

router.get(
  "/:profileId",
  asyncHandler(async (req, res) => {
    const p = await Profile.findById(req.params.profileId).select(
      "-verification",
    );
    if (!p)
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    ok(res, p);
  }),
);

module.exports = router;
