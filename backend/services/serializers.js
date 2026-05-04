const storageService = require("./storage.service");

const DEFAULT_AVATAR = "/uploads/default-avatar.svg";

const normalizeProfileFields = (profile = {}) => ({
  bio: profile.bio || "",
  displayName: profile.displayName || "",
});

const resolveAvatarUrl = async (profile = {}) => {
  if (profile.avatarStorageProvider === "tigris" && profile.avatarStorageKey) {
    return storageService.getSignedObjectUrl(
      profile.avatarStorageKey,
      profile.avatarOriginalName || "avatar",
    );
  }

  return profile.avatar || DEFAULT_AVATAR;
};

const serializeUser = async (user) => {
  const avatar = await resolveAvatarUrl(user.profile);

  return {
    _id: user._id,
    email: user.email,
    username: user.username,
    status: user.status,
    lastSeen: user.lastSeen,
    profile: {
      avatar,
      ...normalizeProfileFields(user.profile),
    },
    createdAt: user.createdAt,
  };
};

const serializeAttachment = async (attachment) => {
  let url = attachment.url;

  if (attachment.storageProvider === "tigris" && attachment.storageKey) {
    url = await storageService.getSignedObjectUrl(
      attachment.storageKey,
      attachment.originalName,
    );
  }

  return {
    originalName: attachment.originalName,
    url,
    mimeType: attachment.mimeType || "application/octet-stream",
    size: attachment.size || 0,
    storageProvider: attachment.storageProvider || "local",
    storageKey: attachment.storageKey || "",
  };
};

const serializeMessage = async (message) => {
  const messageObject =
    typeof message.toObject === "function" ? message.toObject() : { ...message };

  return {
    ...messageObject,
    attachments: await Promise.all(
      (messageObject.attachments || []).map(serializeAttachment),
    ),
  };
};

const serializeConversation = async (
  conversation,
  userId,
  getUnreadCountForUser,
) => ({
  _id: conversation._id,
  participants: await Promise.all(
    conversation.participants.map(serializeUser),
  ),
  name: conversation.name,
  lastMessage: conversation.lastMessage
    ? await serializeMessage(conversation.lastMessage)
    : null,
  unreadCount: getUnreadCountForUser(conversation, userId),
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

module.exports = {
  DEFAULT_AVATAR,
  serializeAttachment,
  serializeConversation,
  serializeMessage,
  serializeUser,
};
