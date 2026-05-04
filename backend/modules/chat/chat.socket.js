const Message = require("../../models/Message.model");
const Conversation = require("../../models/Conversation.model");
const User = require("../../models/User.model");
const authService = require("../auth/auth.service");
const conversationsController = require("../conversations/conversations.controller");
const usersController = require("../users/users.controller");
const serializers = require("../../services/serializers");

const connectedUsers = new Map();
const typingUsers = new Map(); // Track typing users per conversation: conversation -> Set of userIds

const emitUsersList = async (io) => {
  const users = await User.find().sort({ username: 1 });
  io.emit("usersList", await Promise.all(users.map(usersController.toPublicUser)));
};

const emitConversationToParticipants = async (io, conversation) => {
  for (const participant of conversation.participants) {
    const conversationResponse =
      await conversationsController.toConversationResponse(
        conversation,
        participant._id.toString(),
      );
    io.to(`user:${participant._id.toString()}`).emit(
      "conversationUpdated",
      conversationResponse,
    );
  }
};

const resetConversationUnreadCount = async (io, conversationId, userId) => {
  const conversation = await conversationsController.syncUnreadCounts(
    await Conversation.findById(conversationId),
  );

  if (!conversation) {
    return null;
  }

  const unreadEntry = conversation.unreadCounts.find(
    (entry) => entry.userId.toString() === userId,
  );

  if (!unreadEntry || unreadEntry.count === 0) {
    return conversation;
  }

  unreadEntry.count = 0;
  await conversation.save();

  const refreshedConversation =
    await conversationsController.getConversationForUser(conversationId, userId);

  if (refreshedConversation) {
    await emitConversationToParticipants(io, refreshedConversation);
  }

  return refreshedConversation;
};

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication token is required."));
      }

      const decoded = authService.verifyToken(token);

      if (decoded.tokenType === "refresh") {
        return next(new Error("Use an access token for socket connections."));
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("Authenticated user was not found."));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Invalid or expired authentication token."));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user.username, socket.id);

    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);

    const userSockets = connectedUsers.get(userId) || new Set();
    userSockets.add(socket.id);
    connectedUsers.set(userId, userSockets);

    User.findByIdAndUpdate(
      userId,
      {
        status: "online",
        lastSeen: null,
      },
      {
        returnDocument: "after",
      },
    )
      .then((user) => {
        return usersController.toPublicUser(user).then((publicUser) => {
          io.emit("userStatusChanged", {
            userId,
            status: "online",
            lastSeen: null,
            user: publicUser,
          });

          return emitUsersList(io);
        });
      })
      .catch((error) =>
        console.error("Error setting user online:", error.message),
      );

    socket.on("getUsersList", async () => {
      try {
        await emitUsersList(io);
      } catch (error) {
        console.error("Error emitting users list:", error.message);
      }
    });

    socket.on("joinConversation", async (conversationId) => {
      try {
        const conversation =
          await conversationsController.getConversationForUser(
            conversationId,
            userId,
          );

        if (!conversation) {
          return;
        }

        socket.join(`conversation:${conversationId}`);
        await resetConversationUnreadCount(io, conversationId, userId);
      } catch (error) {
        console.error("Error joining conversation:", error.message);
      }
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("markConversationRead", async (conversationId) => {
      try {
        if (!conversationId) {
          return;
        }

        await resetConversationUnreadCount(io, conversationId, userId);
      } catch (error) {
        console.error("Error marking conversation read:", error.message);
      }
    });

    socket.on("refreshConversation", async (conversationId) => {
      try {
        const conversation =
          await conversationsController.getConversationForUser(
            conversationId,
            userId,
          );

        if (!conversation) {
          return;
        }

        emitConversationToParticipants(io, conversation);
      } catch (error) {
        console.error("Error refreshing conversation:", error.message);
      }
    });

    socket.on("conversationDeleted", (data) => {
      const participantIds = data?.participantIds || [];
      const conversationId = data?.conversationId;

      participantIds.forEach((participantId) => {
        io.to(`user:${participantId}`).emit("conversationDeleted", {
          conversationId,
        });
      });
    });

    socket.on("sendMessage", async (data) => {
      try {
        console.log("Message received:", data);

        if (!data.conversationId) {
          return;
        }

        const messageText = String(data.message || "").trim();
        const attachments = Array.isArray(data.attachments)
          ? data.attachments
              .filter(
                (attachment) =>
                  (attachment?.url || attachment?.storageKey) &&
                  attachment?.originalName,
              )
              .map((attachment) => ({
                originalName: String(attachment.originalName),
                url: String(attachment.url || ""),
                storageProvider: String(attachment.storageProvider || "local"),
                storageKey: String(attachment.storageKey || ""),
                bucket: String(attachment.bucket || ""),
                mimeType: String(
                  attachment.mimeType || "application/octet-stream",
                ),
                size: Number(attachment.size || 0),
              }))
          : [];

        if (!messageText && attachments.length === 0) {
          return;
        }

        const conversation =
          await conversationsController.getConversationForUser(
            data.conversationId,
            userId,
          );

        if (!conversation) {
          return;
        }

        const savedMessage = await Message.create({
          clientId: data.clientId,
          conversationId: conversation._id,
          senderId: socket.user._id,
          sender: socket.user.username,
          message: messageText,
          attachments,
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: savedMessage._id,
          updatedAt: new Date(),
        });

        await conversationsController.syncUnreadCounts(
          await Conversation.findById(conversation._id),
        );

        await Conversation.updateOne(
          { _id: conversation._id },
          {
            $inc: {
              "unreadCounts.$[entry].count": 1,
            },
          },
          {
            arrayFilters: [{ "entry.userId": { $ne: socket.user._id } }],
          },
        );

        const updatedConversation =
          await conversationsController.getConversationForUser(
            conversation._id,
            userId,
          );
        const serializedMessage = await serializers.serializeMessage(savedMessage);
        io.to(`conversation:${conversation._id}`).emit(
          "receiveMessage",
          serializedMessage,
        );
        await emitConversationToParticipants(io, updatedConversation);

        // Clear typing status when message is sent
        const conversationId = conversation._id.toString();
        const typingSet = typingUsers.get(conversationId);
        if (typingSet) {
          typingSet.delete(userId);
          if (typingSet.size === 0) {
            typingUsers.delete(conversationId);
          }
        }
        io.to(`conversation:${conversationId}`).emit("userStoppedTyping", {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error("Error saving message:", error.message);
      }
    });

    socket.on("userTyping", (data) => {
      try {
        const conversationId = data?.conversationId;
        if (!conversationId) {
          return;
        }

        // Track typing user
        const typingSet = typingUsers.get(conversationId) || new Set();
        typingSet.add(userId);
        typingUsers.set(conversationId, typingSet);

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit("userIsTyping", {
          userId,
          username: socket.user.username,
          conversationId,
        });

        // Auto-stop typing after 5 seconds of inactivity
        const timeoutKey = `${conversationId}-${userId}`;
        if (socket.typingTimeouts && socket.typingTimeouts[timeoutKey]) {
          clearTimeout(socket.typingTimeouts[timeoutKey]);
        }

        if (!socket.typingTimeouts) {
          socket.typingTimeouts = {};
        }

        socket.typingTimeouts[timeoutKey] = setTimeout(() => {
          const typingSet = typingUsers.get(conversationId);
          if (typingSet) {
            typingSet.delete(userId);
            if (typingSet.size === 0) {
              typingUsers.delete(conversationId);
            }
          }
          io.to(`conversation:${conversationId}`).emit("userStoppedTyping", {
            userId,
            conversationId,
          });
          if (socket.typingTimeouts) {
            delete socket.typingTimeouts[timeoutKey];
          }
        }, 5000);
      } catch (error) {
        console.error("Error handling typing event:", error.message);
      }
    });

    socket.on("stopTyping", (data) => {
      try {
        const conversationId = data?.conversationId;
        if (!conversationId) {
          return;
        }

        // Remove typing user
        const typingSet = typingUsers.get(conversationId);
        if (typingSet) {
          typingSet.delete(userId);
          if (typingSet.size === 0) {
            typingUsers.delete(conversationId);
          }
        }

        // Clear timeout
        const timeoutKey = `${conversationId}-${userId}`;
        if (socket.typingTimeouts && socket.typingTimeouts[timeoutKey]) {
          clearTimeout(socket.typingTimeouts[timeoutKey]);
          delete socket.typingTimeouts[timeoutKey];
        }

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit("userStoppedTyping", {
          userId,
          conversationId,
        });
      } catch (error) {
        console.error("Error handling stop typing event:", error.message);
      }
    });

    socket.on("markAsRead", async (data) => {
      try {
        const messageId = data?.messageId;
        if (!messageId) {
          return;
        }

        // Find and update message
        const message = await Message.findById(messageId);
        if (!message) {
          return;
        }

        // Check if user has already read this message
        const alreadyRead = message.readBy?.some(
          (entry) => entry.userId.toString() === userId,
        );
        if (alreadyRead) {
          return;
        }

        // Add user to readBy array
        if (!message.readBy) {
          message.readBy = [];
        }
        message.readBy.push({
          userId: socket.user._id,
          readAt: new Date(),
        });

        // Update status to 'read' if all participants have read it
        const conversation = await Conversation.findById(
          message.conversationId,
        );
        if (
          conversation &&
          message.readBy.length === conversation.participants.length - 1
        ) {
          message.status = "read";
        } else if (message.status === "sent") {
          // Update to 'delivered' on first read
          message.status = "delivered";
        }

        await message.save();

        if (message.conversationId) {
          await resetConversationUnreadCount(
            io,
            message.conversationId.toString(),
            userId,
          );
        }

        // Broadcast read status to conversation room
        io.to(`conversation:${message.conversationId}`).emit("messageRead", {
          messageId: message._id,
          readBy: message.readBy,
          status: message.status,
        });
      } catch (error) {
        console.error("Error marking message as read:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.user.username, socket.id);

      // Clean up typing state
      if (socket.typingTimeouts) {
        Object.values(socket.typingTimeouts).forEach((timeout) =>
          clearTimeout(timeout),
        );
      }

      // Remove user from all typing lists
      for (const [conversationId, typingSet] of typingUsers.entries()) {
        if (typingSet.has(userId)) {
          typingSet.delete(userId);
          if (typingSet.size === 0) {
            typingUsers.delete(conversationId);
          } else {
            // Notify room that user stopped typing
            io.to(`conversation:${conversationId}`).emit("userStoppedTyping", {
              userId,
              conversationId,
            });
          }
        }
      }

      const sockets = connectedUsers.get(userId);
      sockets?.delete(socket.id);

      if (sockets && sockets.size > 0) {
        connectedUsers.set(userId, sockets);
        return;
      }

      connectedUsers.delete(userId);

      const lastSeen = new Date();

      User.findByIdAndUpdate(
        userId,
        {
          status: "offline",
          lastSeen,
        },
        {
          returnDocument: "after",
        },
      )
        .then((user) => {
          return usersController.toPublicUser(user).then((publicUser) => {
            io.emit("userStatusChanged", {
              userId,
              status: "offline",
              lastSeen,
              user: publicUser,
            });

            return emitUsersList(io);
          });
        })
        .catch((error) =>
          console.error("Error setting user offline:", error.message),
        );
    });
  });
};
