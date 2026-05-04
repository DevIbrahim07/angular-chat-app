const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const usersController = require("./users.controller");

const router = express.Router();

router.get("/users", authMiddleware, usersController.getUsers);
router.get("/users/:id", authMiddleware, usersController.getUserById);
router.put("/users/:id", authMiddleware, usersController.updateProfile);
router.post(
  "/users/:id/avatar",
  authMiddleware,
  usersController.uploadAvatarMiddleware,
  usersController.updateAvatar,
);

module.exports = router;
