const jwt = require("jsonwebtoken");
const User = require("../models/User");
exports.protect = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.id);
    if (!req.user || req.user.status === "deleted")
      return res
        .status(401)
        .json({ success: false, message: "Account unavailable" });
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
exports.adminOnly = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res
        .status(403)
        .json({ success: false, message: "Admin access required" });
