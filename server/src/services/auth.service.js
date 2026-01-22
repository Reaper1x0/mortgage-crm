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
    return user;
  },
};

module.exports = UserService;
