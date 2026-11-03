const dns = require("dns");
const mongoose = require("mongoose");

// Fix for Windows / Node.js DNS SRV resolution issue (ECONNREFUSED)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

module.exports = async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
};
