const express = require("express");
const authController = require("./auth.controller");

const router = express.Router();

router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/send-otp", authController.sendOtp);
router.post("/auth/verify-signup-otp", authController.verifySignupOtp);
router.post("/auth/verify-login-otp", authController.verifyLoginOtp);

module.exports = router;
