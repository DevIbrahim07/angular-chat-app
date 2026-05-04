const Conversation = require("../../models/Conversation.model");
const Message = require("../../models/Message.model");
const serializers = require("../../services/serializers");

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

const syncUnreadCounts = async (conversation) => {
  if (!conversation) {
    return conversation;
  }

  const participantIds = conversation.participants.map((participant) =>
    participant._id ? participant._id.toString() : participant.toString(),
  );
  const unreadCounts = conversation.unreadCounts || [];
  let didChange = false;

  participantIds.forEach((participantId) => {
    const hasEntry = unreadCounts.some(
      (entry) => entry.userId.toString() === participantId,
    );

    if (!hasEntry) {
      unreadCounts.push({
        userId: participantId,
        count: 0,
      });
      didChange = true;
    }
  });

  conversation.unreadCounts = unreadCounts.filter((entry) =>
    participantIds.includes(entry.userId.toString()),
  );

  if (conversation.unreadCounts.length !== unreadCounts.length) {
    didChange = true;
  }

  if (didChange) {
    await conversation.save();
  }

  return conversation;
};

const getUnreadCountForUser = (conversation, userId) => {
  if (!userId) {
    return 0;
  }

  const unreadEntry = (conversation.unreadCounts || []).find(
    (entry) => entry.userId.toString() === userId.toString(),
  );

  return unreadEntry?.count || 0;
};

const toConversationResponse = (conversation, userId) =>
  serializers.serializeConversation(
    conversation,
    userId,
    getUnreadCountForUser,
  );

const getConversationForUser = async (conversationId, userId) => {
  const conversation = await populateConversation(
    Conversation.findById(conversationId),
  );

  if (!conversation || !isParticipant(conversation, userId)) {
    return null;
  }

  return syncUnreadCounts(conversation);
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
        await syncUnreadCounts(existingConversation);
        return res
          .status(200)
          .json(await toConversationResponse(existingConversation, currentUserId));
      }
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      name,
      unreadCounts: participantIds.map((participantId) => ({
        userId: participantId,
        count: 0,
      })),
    });

    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id),
    );

    res
      .status(201)
      .json(await toConversationResponse(populatedConversation, currentUserId));
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
    const syncedConversations = await Promise.all(
      conversations.map((conversation) => syncUnreadCounts(conversation)),
    );

    res
      .status(200)
      .json(
        await Promise.all(
          syncedConversations.map((conversation) =>
            toConversationResponse(conversation, req.user._id.toString()),
          ),
        ),
      );
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

    res.status(200).json(await Promise.all(messages.map(serializers.serializeMessage)));
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
exports.getUnreadCountForUser = getUnreadCountForUser;
exports.syncUnreadCounts = syncUnreadCounts;
