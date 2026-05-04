const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../../models/User.model");
const authService = require("./auth.service");

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();
const normalizeUsername = (username) => String(username || "").trim();

// signup
exports.signup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");

    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ message: "Please enter a valid email address." });
    }

    if (!validator.isLength(username, { min: 3, max: 30 })) {
      return res
        .status(400)
        .json({ message: "Username must be between 3 and 30 characters." });
    }

    if (!validator.isAlphanumeric(username, "en-US", { ignore: "_-" })) {
      return res.status(400).json({
        message:
          "Username can only contain letters, numbers, underscores, and hyphens.",
      });
    }

    if (!validator.isLength(password, { min: 6 })) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Email or username is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });

    res.status(201).json(authService.createAuthResponse(user));
  } catch (error) {
    res.status(500).json({
      message: "Error creating account",
      error: error.message,
    });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!validator.isEmail(email) || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.status(200).json(authService.createAuthResponse(user));
  } catch (error) {
    res.status(500).json({
      message: "Error logging in",
      error: error.message,
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    const decoded = authService.verifyToken(refreshToken);

    if (decoded.tokenType !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    res.status(200).json({
      token: authService.generateAccessToken(user),
    });
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired refresh token.",
    });
  }
};
