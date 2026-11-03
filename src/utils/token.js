const jwt = require("jsonwebtoken");
exports.signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
exports.ok = (res, data, message = "Success", status = 200) =>
  res.status(status).json({ success: true, message, data });
