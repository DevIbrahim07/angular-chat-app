const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    profile: {
      avatar: {
        type: String,
        default: "/uploads/default-avatar.svg",
        trim: true,
      },
      avatarStorageProvider: {
        type: String,
        enum: ["local", "tigris"],
        default: "local",
      },
      avatarStorageKey: {
        type: String,
        default: "",
        trim: true,
      },
      avatarOriginalName: {
        type: String,
        default: "",
        trim: true,
      },
      bio: {
        type: String,
        default: "",
        trim: true,
        maxlength: 160,
      },
      displayName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 50,
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
