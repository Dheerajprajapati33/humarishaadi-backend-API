require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Profile = require("../models/Profile");

const sampleProfiles = [
  {
    phone: "9876543211",
    profile: {
      profileFor: "Self",
      gender: "female",
      name: "Priya Sharma",
      dob: new Date("2000-05-15"), // ~26 years
      religion: "Hindu",
      caste: "Brahmin",
      otherCastes: true,
      gotra: "Vashishta",
      motherTongue: ["Hindi"],
      city: {
        name: "Lucknow",
        state: "Uttar Pradesh",
        stateCode: "UP",
        districtCode: "LKO",
      },
      height: "5 ft 4 in",
      diet: "Vegetarian",
      maritalStatus: "Never Married",
      about:
        "Software Engineer working at an MNC in Lucknow. Enjoy reading, traveling, and spending time with family.",
      photos: [
        {
          url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500",
          isPrimary: true,
        },
      ],
      occupation: "Software Engineer",
      salaryRange: "₹50,000 - ₹75,000",
      companyName: "TCS",
      companyLocation: "Lucknow",
      education: "Graduate",
      family: {
        fatherStatus: "Employed",
        motherStatus: "Homemaker",
        place: "Lucknow",
        monthlySalary: "60000",
        property: ["House"],
        type: "Nuclear",
        siblings: "1 sister",
      },
      astrology: {
        mangalDosha: "No",
        birthPlace: "Lucknow",
        birthTime: "08:15 AM",
      },
      health: {
        alcohol: "No",
        smoking: "No",
        issues: [],
        disability: "None",
      },
      completion: 95,
    },
  },
  {
    phone: "9876543212",
    profile: {
      profileFor: "Self",
      gender: "female",
      name: "Ananya Mishra",
      dob: new Date("2001-08-20"), // ~25 years
      religion: "Hindu",
      caste: "Brahmin",
      otherCastes: false,
      gotra: "Bhardwaj",
      motherTongue: ["Hindi", "English"],
      city: {
        name: "Lucknow",
        state: "Uttar Pradesh",
        stateCode: "UP",
        districtCode: "LKO",
      },
      height: "5 ft 3 in",
      diet: "Vegetarian",
      maritalStatus: "Never Married",
      about:
        "Warm-hearted and ambitious graduate looking for a suitable partner with similar family values.",
      photos: [
        {
          url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500",
          isPrimary: true,
        },
      ],
      occupation: "Software Engineer",
      salaryRange: "₹75,000 - ₹1,00,000",
      companyName: "Infosys",
      companyLocation: "Lucknow",
      education: "Graduate",
      family: {
        fatherStatus: "Government Employee",
        motherStatus: "Teacher",
        place: "Lucknow",
        monthlySalary: "80000",
        property: ["House", "Plot"],
        type: "Nuclear",
        siblings: "1 brother",
      },
      astrology: {
        mangalDosha: "No",
        birthPlace: "Lucknow",
        birthTime: "02:30 PM",
      },
      health: {
        alcohol: "No",
        smoking: "No",
        issues: [],
        disability: "None",
      },
      completion: 90,
    },
  },
  {
    phone: "9876543213",
    profile: {
      profileFor: "Self",
      gender: "female",
      name: "Ritu Verma",
      dob: new Date("1999-11-10"), // ~27 years
      religion: "Hindu",
      caste: "Example caste",
      otherCastes: true,
      gotra: "Kashyap",
      motherTongue: ["Hindi"],
      city: {
        name: "Lucknow",
        state: "Uttar Pradesh",
        stateCode: "UP",
        districtCode: "LKO",
      },
      height: "5 ft 5 in",
      diet: "Eggetarian",
      maritalStatus: "Never Married",
      about:
        "Professional working in Lucknow. Down-to-earth person who values simplicity and mutual respect.",
      photos: [
        {
          url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500",
          isPrimary: true,
        },
      ],
      occupation: "Private Company",
      salaryRange: "₹30,000 - ₹50,000",
      companyName: "HCL Tech",
      companyLocation: "Lucknow",
      education: "Bachelor degree",
      family: {
        fatherStatus: "Business",
        motherStatus: "Homemaker",
        place: "Lucknow",
        monthlySalary: "50000",
        property: ["House"],
        type: "Joint",
        siblings: "2 sisters",
      },
      astrology: {
        mangalDosha: "No",
        birthPlace: "Lucknow",
        birthTime: "06:00 AM",
      },
      health: {
        alcohol: "No",
        smoking: "No",
        issues: [],
        disability: "None",
      },
      completion: 85,
    },
  },
  {
    phone: "9876543214",
    profile: {
      profileFor: "Self",
      gender: "female",
      name: "Kavita Tiwari",
      dob: new Date("2002-03-25"), // ~24 years
      religion: "Hindu",
      caste: "Brahmin",
      otherCastes: true,
      gotra: "Shandilya",
      motherTongue: ["Hindi"],
      city: {
        name: "Kanpur",
        state: "Uttar Pradesh",
        stateCode: "UP",
        districtCode: "KNP",
      },
      height: "5 ft 2 in",
      diet: "Vegetarian",
      maritalStatus: "Never Married",
      about:
        "Creative and family-oriented. Looking for someone grounded and understanding.",
      photos: [
        {
          url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500",
          isPrimary: true,
        },
      ],
      occupation: "Government / Defense",
      salaryRange: "₹50,000 - ₹75,000",
      companyName: "State Bank of India",
      companyLocation: "Kanpur",
      education: "Master degree",
      family: {
        fatherStatus: "Retired",
        motherStatus: "Homemaker",
        place: "Kanpur",
        monthlySalary: "45000",
        property: ["House"],
        type: "Nuclear",
        siblings: "1 brother",
      },
      astrology: {
        mangalDosha: "No",
        birthPlace: "Kanpur",
        birthTime: "11:20 AM",
      },
      health: {
        alcohol: "No",
        smoking: "No",
        issues: [],
        disability: "None",
      },
      completion: 88,
    },
  },
];

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB for seeding...");

  for (const item of sampleProfiles) {
    let user = await User.findOne({ phone: item.phone });
    if (!user) {
      user = await User.create({
        phone: item.phone,
        role: "user",
        status: "active",
        language: "hi",
        onboardingCompleted: true,
      });
    }

    await Profile.findOneAndUpdate(
      { user: user._id },
      { $set: { ...item.profile, user: user._id } },
      { upsert: true, new: true, runValidators: true },
    );
    console.log(
      `Seeded profile: ${item.profile.name} (${item.profile.gender}, ${item.profile.caste}, ${item.profile.city.name})`,
    );
  }

  console.log("Seeding completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
