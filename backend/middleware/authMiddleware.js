const User = require("../models/User.model");
const authService = require("../modules/auth/auth.service");

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length);
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const decoded = authService.verifyToken(token);

    if (decoded.tokenType === "refresh") {
      return res.status(401).json({ message: "Use an access token for this request." });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Authenticated user was not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired authentication token." });
  }
};

authMiddleware.getBearerToken = getBearerToken;

module.exports = authMiddleware;
