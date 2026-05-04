const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES_IN = "1d";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const createTokenPayload = (user) => ({
  userId: user._id.toString(),
  email: user.email,
  username: user.username,
});

exports.generateAccessToken = (user) =>
  jwt.sign(createTokenPayload(user), getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

exports.generateRefreshToken = (user) =>
  jwt.sign(
    {
      ...createTokenPayload(user),
      tokenType: "refresh",
    },
    getJwtSecret(),
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );

exports.verifyToken = (token) => jwt.verify(token, getJwtSecret());

const DEFAULT_AVATAR = "/uploads/default-avatar.svg";

const normalizeProfile = (profile = {}) => ({
  avatar: profile.avatar || DEFAULT_AVATAR,
  bio: profile.bio || "",
  displayName: profile.displayName || "",
});

exports.toAuthUser = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  status: user.status,
  lastSeen: user.lastSeen,
  profile: normalizeProfile(user.profile),
  createdAt: user.createdAt,
});

exports.normalizeProfile = normalizeProfile;

exports.createAuthResponse = (user) => ({
  token: exports.generateAccessToken(user),
  refreshToken: exports.generateRefreshToken(user),
  user: exports.toAuthUser(user),
});
