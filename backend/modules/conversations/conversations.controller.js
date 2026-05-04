const Conversation = require("../../models/Conversation.model");
const Message = require("../../models/Message.model");
const usersController = require("../users/users.controller");

const populateConversation = (query) =>
  query
    .populate(
      "participants",
      "email username status lastSeen profile createdAt",
    )
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

const isParticipant = (conversation, userId) =>
  conversation.participants.some(
    (participant) => participant._id.toString() === userId,
  );

const toConversationResponse = (conversation) => ({
  _id: conversation._id,
  participants: conversation.participants.map(usersController.toPublicUser),
  name: conversation.name,
  lastMessage: conversation.lastMessage,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

const getConversationForUser = async (conversationId, userId) => {
  const conversation = await populateConversation(
    Conversation.findById(conversationId),
  );

  if (!conversation || !isParticipant(conversation, userId)) {
    return null;
  }

  return conversation;
};

exports.createConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const participantIds = Array.from(
      new Set([currentUserId, ...(req.body.participantIds || []).map(String)]),
    );
    const name = String(req.body.name || "").trim();

    if (participantIds.length < 2) {
      return res
        .status(400)
        .json({ message: "Select at least one other user." });
    }

    if (!name && participantIds.length === 2) {
      const existingConversation = await populateConversation(
        Conversation.findOne({
          participants: { $all: participantIds, $size: participantIds.length },
          name: "",
        }),
      );

      if (existingConversation) {
        return res
          .status(200)
          .json(toConversationResponse(existingConversation));
      }
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      name,
    });

    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );

    res.status(201).json(toConversationResponse(populatedConversation));
  } catch (error) {
    res.status(500).json({
      message: "Error creating conversation",
      error: error.message,
    });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = await populateConversation(
      Conversation.find({ participants: req.user._id }),
    );

    res.status(200).json(conversations.map(toConversationResponse));
  } catch (error) {
    res.status(500).json({
      message: "Error fetching conversations",
      error: error.message,
    });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const conversation = await getConversationForUser(
      req.params.id,
      req.user._id.toString(),
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching conversation messages",
      error: error.message,
    });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await getConversationForUser(
      req.params.id,
      req.user._id.toString(),
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.deleteOne({ _id: conversation._id });

    res.status(200).json({
      message: "Conversation deleted.",
      conversationId: conversation._id,
      participantIds: conversation.participants.map((participant) =>
        participant._id.toString(),
      ),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting conversation",
      error: error.message,
    });
  }
};

exports.getConversationForUser = getConversationForUser;
exports.toConversationResponse = toConversationResponse;
