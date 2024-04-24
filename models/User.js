const { Schema, model } = require("mongoose");

const UserSchema = new Schema(
  {
    name: {
      type: String,
      default: "",
    },
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    verificationCode: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    followings: {
      type: Array,
      default: [],
    },
    followedGroups: {
      type: Array,
      default: [],
    },
    followers: {
      type: Array,
      default: [],
    },
    biography: {
      type: String,
      max: 50,
      default: "",
    },
    birthday: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      max: 50,
    },
    getStreamToken: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = model("users", UserSchema);
