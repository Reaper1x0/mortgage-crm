const { User } = require("../models");
const userService = require("./user.service");

const AuthService = {
  register: async (user) => {
    const existingUsername = await userService.getUserByUserName(user.username);
    if (existingUsername) {
      const err = new Error("Username already taken.");
      err.statusCode = 409;
      throw err;
    }
    const newUser = new User({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: user.password,
      role: "user",
    });
    try {
      await newUser.save();
    } catch (error) {
      if (error?.code === 11000 && String(error?.message || "").includes("username")) {
        const err = new Error("Username already taken.");
        err.statusCode = 409;
        throw err;
      }
      throw error;
    }
    return newUser;
  },

  login: async (credentials) => {
    const { email, password } = credentials;
    const user = await userService.getUserByEmail(email);
    if (!user || !(await user.isPasswordMatch(password))) return false;
    return user;
  },
};

module.exports = AuthService;
