const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  clientId: String,
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    default: null,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  sender: String,
  message: String,
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      readAt: Date,
    },
  ],
  attachments: [
    {
      originalName: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      storageProvider: {
        type: String,
        enum: ["local", "tigris"],
        default: "local",
      },
      storageKey: {
        type: String,
        default: "",
      },
      bucket: {
        type: String,
        default: "",
      },
      mimeType: {
        type: String,
        default: "application/octet-stream",
      },
      size: {
        type: Number,
        default: 0,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);
