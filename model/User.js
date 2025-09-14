const mongoose = require("mongoose");
const brcypt = require("bcrypt");
const ForbiddenUsernames = require("../config/ForbiddenUsernamesConfig");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    lowercase: true,
    validate: {
      validator: function (v) {
        return !ForbiddenUsernames.includes(v) && !v.includes(".");
      },
      message: (props) =>
        `${props.value} is not allowed as a username. Please choose another one.`,
    },
  },
  password: { type: String, required: true, minlength: 4 },
  sharedstatus: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0: undefined , 1:Ok , 2:Help , 3:Emergency
  status: { type: Number, enum: [0, 1], default: 0 }, // 0: active, 1: inactive
  role: { type: Number, enum: [0, 1, 2], default: 0 }, // 0: citizen, 1: coordinator , 2: admin
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre("save", async function (next) {
  if (this.isModified("password") || this.isNew) {
    this.password = await brcypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.validatePassword = async function (password) {
  try {
    return await brcypt.compare(password, this.password);
  } catch (e) {
    throw new Error("Password validation error");
  }
};

UsuerSchema.methods.toJSON = function () {
  const user = this.toObject();
  return {
    _id: user._id,
    username: user.username,
    sharedstatus: user.sharedstatus,
    status: user.status,
    role: user.role,
  };
};

UserSchema.static.findByUsername = function (username) {
  return this.findOne({ username });
};

const User = mongoose.model("User", UserSchema);

module.exports = User;
