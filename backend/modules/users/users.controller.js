const fs = require("fs");
const path = require("path");
const multer = require("multer");
const validator = require("validator");
const User = require("../../models/User.model");
const authService = require("../auth/auth.service");

const avatarsDirectory = path.join(__dirname, "../../uploads/avatars");
fs.mkdirSync(avatarsDirectory, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}-${Date.now()}${extension}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }

    cb(null, true);
  },
});

const toPublicUser = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  status: user.status,
  lastSeen: user.lastSeen,
  profile: authService.normalizeProfile(user.profile),
  createdAt: user.createdAt,
});

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 });

    res.status(200).json(users.map(toPublicUser));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(toPublicUser(user));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own profile." });
    }

    const profile = req.body.profile || {};
    const displayName = String(profile.displayName || "").trim();
    const bio = String(profile.bio || "").trim();

    if (displayName && !validator.isLength(displayName, { max: 50 })) {
      return res
        .status(400)
        .json({ message: "Display name must be 50 characters or less." });
    }

    if (bio && !validator.isLength(bio, { max: 160 })) {
      return res
        .status(400)
        .json({ message: "Bio must be 160 characters or less." });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "profile.displayName": displayName,
        "profile.bio": bio,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    res.status(200).json({
      user: authService.toAuthUser(user),
      publicUser: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

exports.uploadAvatarMiddleware = avatarUpload.single("avatar");

exports.updateAvatar = async (req, res) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only update your own avatar." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Avatar image is required." });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        "profile.avatar": avatarPath,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    res.status(200).json({
      user: authService.toAuthUser(user),
      publicUser: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating avatar",
      error: error.message,
    });
  }
};

exports.toPublicUser = toPublicUser;
