const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const contactsController = require("./contacts.controller");

const router = express.Router();

router.get("/contacts", authMiddleware, contactsController.getContacts);
router.post("/contacts", authMiddleware, contactsController.createContact);
router.delete("/contacts/:id", authMiddleware, contactsController.deleteContact);

module.exports = router;
