const Message = require("../../models/Message.model");

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching messages",
      error: error.message,
    });
  }
};
