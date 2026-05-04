const express = require("express");
const authController = require("./auth.controller");

const router = express.Router();

router.post("/auth/signup", authController.signup);
router.post("/auth/login", authController.login);
router.post("/auth/refresh", authController.refresh);

module.exports = router;
