const { User } = require("../models");
const { mongoosePaginate } = require("../utils/mongoosePaginate.utils");

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
  listUsers: async function (options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, filter = {} } = options;

    return mongoosePaginate({
      model: User,
      filter,
      sort,
      page,
      limit,
      lean: true,
    });
  },
  deleteUserById: async function (id) {
    const user = await this.getUserById(id);
    if (!user) return false;
    await User.findByIdAndDelete(id);
    return true;
  },
  createUser: async function (userData) {
    const newUser = new User(userData);
    return await newUser.save();
  },
};

module.exports = UserService;
