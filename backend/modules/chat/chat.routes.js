const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const authMiddleware = require("../../middleware/authMiddleware");

// GET /api/chat/messages
router.get("/messages", authMiddleware, chatController.getMessages);

module.exports = router;
