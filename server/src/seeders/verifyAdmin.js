// Quick verification script to check admin user
// Run with: node src/seeders/verifyAdmin.js

const mongoose = require("mongoose");
const User = require("../models/user.model");
const { mongoConfig } = require("../config/");

async function verifyAdmin() {
  try {
    await mongoose.connect(mongoConfig.url, mongoConfig.options);
    console.log("Connected to database");

    const adminUser = await User.findOne({ email: "admin@mortgagecrm.com" });
    
    if (!adminUser) {
      console.log("❌ Admin user NOT found");
      console.log("Running seeder...");
      const { seedAdminUser } = require("./adminUser.seeder");
      await seedAdminUser();
      process.exit(0);
    }

    console.log("✅ Admin user found:");
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password hash exists: ${!!adminUser.password}`);

    // Test password
    const testPassword = "Admin@123";
    const match = await adminUser.isPasswordMatch(testPassword);
    console.log(`\nPassword test with "${testPassword}": ${match ? "✅ MATCH" : "❌ NO MATCH"}`);

    if (!match) {
      console.log("\n⚠️  Password doesn't match! Resetting password...");
      adminUser.password = testPassword; // Will be hashed by pre-save hook
      await adminUser.save();
      const newMatch = await adminUser.isPasswordMatch(testPassword);
      console.log(`Password reset test: ${newMatch ? "✅ MATCH" : "❌ NO MATCH"}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

verifyAdmin();

