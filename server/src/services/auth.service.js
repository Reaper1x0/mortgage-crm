const { User } = require("../models");
const userService = require("./user.service");

const AuthService = {
  register: async (user) => {
    const newUser = new User({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: user.password,
      role: "user",
    });
    await newUser.save();
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
