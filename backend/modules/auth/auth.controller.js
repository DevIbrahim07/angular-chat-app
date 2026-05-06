const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../../models/User.model");
const authService = require("./auth.service");
const serializers = require("../../services/serializers");
const twilioService = require("./twilio.service");

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();
const normalizeUsername = (username) => String(username || "").trim();
const normalizePhoneNumber = (phoneNumber) =>
  String(phoneNumber || "").trim().replace(/\s+/g, "");
const isValidPhoneNumber = (phoneNumber) => /^\+[1-9]\d{7,14}$/.test(phoneNumber);
const normalizePurpose = (purpose) => String(purpose || "").trim().toLowerCase();
const buildAuthResponse = async (user) => ({
  token: authService.generateAccessToken(user),
  refreshToken: authService.generateRefreshToken(user),
  user: await serializers.serializeUser(user),
});

// signup
exports.signup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);

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

    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Phone number must be in international format, for example +923001234567.",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username },
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Email, username, or phone number is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      phoneVerified: false,
    });

    res.status(201).json(await buildAuthResponse(user));
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

    res.status(200).json(await buildAuthResponse(user));
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

exports.sendOtp = async (req, res) => {
  try {
    if (!twilioService.isConfigured()) {
      return res.status(500).json({
        message: "Phone verification is not configured right now.",
      });
    }

    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    const purpose = normalizePurpose(req.body.purpose);

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Phone number must be in international format, for example +923001234567.",
      });
    }

    if (!["signup", "login"].includes(purpose)) {
      return res.status(400).json({ message: "Invalid OTP request purpose." });
    }

    const existingUser = await User.findOne({ phoneNumber });

    if (purpose === "signup" && existingUser) {
      return res.status(409).json({
        message: "This phone number is already registered.",
      });
    }

    if (purpose === "login" && !existingUser) {
      return res.status(404).json({
        message: "No account was found for this phone number.",
      });
    }

    await twilioService.sendVerificationCode(phoneNumber);

    res.status(200).json({
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to send verification code right now.",
      error: error.message,
    });
  }
};

exports.verifySignupOtp = async (req, res) => {
  try {
    if (!twilioService.isConfigured()) {
      return res.status(500).json({
        message: "Phone verification is not configured right now.",
      });
    }

    const email = normalizeEmail(req.body.email);
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "");
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    const code = String(req.body.code || "").trim();

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

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Phone number must be in international format, for example +923001234567.",
      });
    }

    if (!validator.isLength(code, { min: 4, max: 10 })) {
      return res.status(400).json({ message: "Please enter the OTP code." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email, username, or phone number is already registered.",
      });
    }

    const verification = await twilioService.checkVerificationCode(
      phoneNumber,
      code,
    );

    if (verification.status !== "approved") {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      phoneNumber,
      phoneVerified: true,
    });

    res.status(201).json(await buildAuthResponse(user));
  } catch (error) {
    res.status(500).json({
      message: "Unable to verify signup right now.",
      error: error.message,
    });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    if (!twilioService.isConfigured()) {
      return res.status(500).json({
        message: "Phone verification is not configured right now.",
      });
    }

    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);
    const code = String(req.body.code || "").trim();

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Phone number must be in international format, for example +923001234567.",
      });
    }

    if (!validator.isLength(code, { min: 4, max: 10 })) {
      return res.status(400).json({ message: "Please enter the OTP code." });
    }

    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({
        message: "No account was found for this phone number.",
      });
    }

    const verification = await twilioService.checkVerificationCode(
      phoneNumber,
      code,
    );

    if (verification.status !== "approved") {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }

    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }

    res.status(200).json(await buildAuthResponse(user));
  } catch (error) {
    res.status(500).json({
      message: "Unable to verify login right now.",
      error: error.message,
    });
  }
};
