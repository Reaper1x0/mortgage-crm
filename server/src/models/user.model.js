const mongoose = require("mongoose");
const { bcryptUtils } = require("../utils");

const userSchema = mongoose.Schema(
  {
    fullName: {
      type: mongoose.Schema.Types.String,
      required: true,
      trim: true,
    },
    username: {
      type: mongoose.Schema.Types.String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: mongoose.Schema.Types.String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: mongoose.Schema.Types.String,
      minLength: 8,
      required: true,
    },
    isEmailVerified: {
      type: mongoose.Schema.Types.Boolean,
      required: true,
      default: true,
    },
    refreshTokens: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    role: {
      type: String,
      enum: ["Admin", "Agent", "Viewer"],
      default: "Viewer",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  const user = this;
  //Cheching if the password is modified before hashing.
  if (user.isModified("password")) {
    user.password = await bcryptUtils.hashPassword(user.password);
  }
  next();
});

userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return await bcryptUtils.comparePasswords(password, user.password);
};

const User = mongoose.model("users", userSchema);

module.exports = User;
