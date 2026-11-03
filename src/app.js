const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const app = express();

// Enable trust proxy for reverse proxies (ngrok, Nginx, cloud load balancers)
// This resolves express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
    ],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  },
});
app.use("/api/v1/auth", authLimiter);
app.get("/health", (req, res) =>
  res.json({ success: true, message: "HumaariShaadi API is running" }),
);

app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/master", require("./routes/master.routes"));
app.use("/api/v1/onboarding", require("./routes/onboarding.routes"));
app.use("/api/v1/profiles", require("./routes/profile.routes"));
app.use("/api/v1/matches", require("./routes/match.routes"));
app.use("/api/v1/interactions", require("./routes/interaction.routes"));
app.use("/api/v1/chats", require("./routes/chat.routes"));
app.use("/api/v1/payments", require("./routes/payment.routes"));
app.use("/api/v1/subscriptions", require("./routes/subscription.routes"));
app.use("/api/v1/biodata", require("./routes/biodata.routes"));
app.use("/api/v1/support", require("./routes/support.routes"));
app.use("/api/v1/account", require("./routes/account.routes"));
app.use("/api/v1/notifications", require("./routes/notification.routes"));

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal server error" });
});
module.exports = app;
