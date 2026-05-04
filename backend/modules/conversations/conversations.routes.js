const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const conversationsController = require("./conversations.controller");

const router = express.Router();

router.post(
  "/conversations",
  authMiddleware,
  conversationsController.createConversation,
);
router.get(
  "/conversations",
  authMiddleware,
  conversationsController.getConversations,
);
router.get(
  "/conversations/:id/messages",
  authMiddleware,
  conversationsController.getConversationMessages,
);
router.delete(
  "/conversations/:id",
  authMiddleware,
  conversationsController.deleteConversation,
);

module.exports = router;
