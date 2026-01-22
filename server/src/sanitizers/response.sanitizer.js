const userSanitizer = (user, blockList = ["password", "__v", "refreshTokens"]) => {
  const obj = user.toObject ? user.toObject() : { ...user }; // handle Mongoose docs & plain objects

  blockList.forEach((field) => {
    delete obj[field];
  });

  return obj;
};

module.exports = { userSanitizer };
