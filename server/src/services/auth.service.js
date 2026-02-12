const { User } = require("../models");
const userService = require("./user.service");

const UserService = {
  register: async (user) => {
    const newUser = new User(user);
    return await newUser.save();
  },

  login: async (credentials) => {
    const { email, password } = credentials;
    const user = await userService.getUserByEmail(email);
    if (!user || !(await user.isPasswordMatch(password))) return false;
    // profile_picture is already populated by getUserByEmail
    return user;
  },
};

module.exports = UserService;
