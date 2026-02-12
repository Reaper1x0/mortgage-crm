const User = require("../models/user.model");

require("dotenv").config();

/**
 * Default admin user credentials
 * These can be overridden via environment variables
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@mortgagecrm.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "System Administrator";

/**
 * Seed admin user if it doesn't exist
 * Checks by email first, then by role if email check fails
 */
const seedAdminUser = async () => {
  try {
    // Check if admin user already exists by email
    let adminUser = await User.findOne({ email: ADMIN_EMAIL });

    // If not found by email, check if any admin user exists
    if (!adminUser) {
      adminUser = await User.findOne({ role: "Admin" });
    }

    if (adminUser) {
      console.log(`✅ Admin user already exists: ${adminUser.email} (${adminUser.role})`);
      
      // Verify password works - if not, reset it
      const passwordMatch = await adminUser.isPasswordMatch(ADMIN_PASSWORD);
      if (!passwordMatch) {
        console.log(`⚠️  Admin password doesn't match. Resetting to default password...`);
        adminUser.password = ADMIN_PASSWORD; // Will be hashed by pre-save hook
        await adminUser.save();
        const newMatch = await adminUser.isPasswordMatch(ADMIN_PASSWORD);
        console.log(`   Password reset ${newMatch ? "✅ SUCCESS" : "❌ FAILED"}`);
        if (newMatch) {
          console.log(`   ⚠️  Default password reset to: ${ADMIN_PASSWORD}`);
        }
      }
      
      return adminUser;
    }

    // Create new admin user
    // Note: Password will be automatically hashed by the user model's pre-save hook
    adminUser = await User.create({
      fullName: ADMIN_FULL_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // Will be hashed automatically by pre-save hook
      role: "Admin",
      isEmailVerified: true,
      refreshTokens: [],
    });

    console.log(`✅ Admin user created successfully:`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Role: Admin`);
    console.log(`   ⚠️  Default password: ${ADMIN_PASSWORD}`);
    console.log(`   ⚠️  Please change the password after first login!`);
    
    // Verify the password was hashed correctly
    const passwordMatch = await adminUser.isPasswordMatch(ADMIN_PASSWORD);
    console.log(`   Password verification test: ${passwordMatch ? "✅ PASS" : "❌ FAIL"}`);

    return adminUser;
  } catch (err) {
    // Handle duplicate key errors (username/email already exists)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      console.log(`⚠️  Admin user with ${field} "${err.keyValue[field]}" already exists`);
      return null;
    }
    console.error("❌ Admin user seed error:", err.message);
    return null;
  }
};

module.exports = { seedAdminUser };

