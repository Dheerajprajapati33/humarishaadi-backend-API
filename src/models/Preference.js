const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Preference",
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        required: true,
      },
      ageMin: { type: Number, default: 18 },
      ageMax: { type: Number, default: 50 },
      allowOtherCastes: { type: Boolean, default: true },
      locations: [String],
      maritalStatuses: [String],
      motherTongues: [String],
      salaryMin: { type: Number, default: 0 },
      salaryMax: { type: Number },
      occupations: [String],
      educationLevels: [String],
      heightMin: String,
      heightMax: String,
      diets: [String],
      mangalDosha: [String],
    },
    { timestamps: true },
  ),
);
