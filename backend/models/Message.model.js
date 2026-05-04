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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);
