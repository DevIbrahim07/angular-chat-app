const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { attachmentUpload } = require("../../middleware/upload");

// GET /api/chat/messages
router.get("/messages", authMiddleware, chatController.getMessages);
router.get(
  "/messages/attachments/download",
  authMiddleware,
  chatController.downloadAttachment,
);
router.post(
  "/messages/attachments",
  authMiddleware,
  attachmentUpload.single("attachment"),
  chatController.uploadAttachment,
);

module.exports = router;
