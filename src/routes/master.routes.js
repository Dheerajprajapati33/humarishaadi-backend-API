const router = require("express").Router();
const data = {
  languages: [
    "Hindi",
    "English",
    "Marathi",
    "Gujarati",
    "Bengali",
    "Kannada",
    "Tamil",
    "Malayalam",
    "Punjabi",
    "Urdu",
    "Telugu",
    "Odia",
  ],
  religions: [
    "Hindu",
    "Muslim",
    "Christian",
    "Sikh",
    "Jain",
    "Parsi",
    "Buddhist",
  ],
  motherTongues: [
    "Hindi",
    "Marathi",
    "Punjabi",
    "Bengali",
    "Gujarati",
    "Urdu",
    "Telugu",
    "Kannada",
    "English",
    "Tamil",
    "Odia",
    "Marwari",
    "Assamese",
    "Awadhi",
    "Bhojpuri",
  ],
  occupations: [
    "Not applicable",
    "Private Company",
    "Government / Defense",
    "Business",
    "Student",
  ],
  education: [
    "10th standard",
    "12th standard",
    "Diploma",
    "Bachelor degree",
    "Master degree",
    "PhD",
  ],
  diets: ["Vegetarian", "Non-Vegetarian", "Eggetarian"],
  maritalStatuses: [
    "Unmarried",
    "Divorced / Getting Divorced",
    "Widow",
    "Widower",
  ],
  salaryRanges: [
    "₹0",
    "₹0 - ₹15,000",
    "₹15,000 - ₹30,000",
    "₹30,000 - ₹50,000",
    "₹50,000 - ₹75,000",
    "₹75,000 - ₹1,00,000",
    "₹1,00,000 - ₹1,50,000",
    "₹1,50,000 - ₹2,00,000",
    "₹2,00,000 - ₹5,00,000",
    "₹5,00,000+",
  ],
};
router.get("/:type", (req, res) => {
  const value = data[req.params.type];
  if (!value)
    return res
      .status(404)
      .json({ success: false, message: "Master data not found" });
  res.json({ success: true, data: value });
});
router.get("/", (req, res) =>
  res.json({ success: true, data: Object.keys(data) }),
);
module.exports = router;
