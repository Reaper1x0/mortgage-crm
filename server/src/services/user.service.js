const { User } = require("../models");

const UserService = {
  getUserByEmail: async (email) => {
    return await User.findOne({ email });
  },
  getUserById: async (id) => {
    return await User.findById(id);
  },
  getUserByUserName: async (username) => {
    return await User.findOne({ username: username });
  },
  updateUserById: async function (id, updateBody) {
    const user = await this.getUserById(id);
    if (!user) return false;
    Object.assign(user, updateBody);
    await user.save();
    return user;
  },
};

module.exports = UserService;
