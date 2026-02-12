/**
 * Consistent user sanitizer - ensures all user objects have the same format
 * Always includes profile_picture if it exists (populated)
 */
const userSanitizer = (user, blockList = ["password", "__v", "refreshTokens"]) => {
  const obj = user.toObject ? user.toObject() : { ...user }; // handle Mongoose docs & plain objects

  blockList.forEach((field) => {
    delete obj[field];
  });

  // Ensure consistent format - profile_picture should be populated object or null
  // If profile_picture is an ObjectId string, it means it wasn't populated
  if (obj.profile_picture && typeof obj.profile_picture === "string" && obj.profile_picture.length === 24) {
    // It's an ObjectId, not populated - set to null to indicate it needs population
    obj.profile_picture = null;
  }

  return obj;
};

module.exports = { userSanitizer };
