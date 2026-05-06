const Contact = require("../../models/Contact.model");
const Conversation = require("../../models/Conversation.model");
const User = require("../../models/User.model");
const serializers = require("../../services/serializers");

const normalizeContactName = (contactName) => String(contactName || "").trim();
const normalizePhoneNumber = (phoneNumber) =>
  String(phoneNumber || "").trim().replace(/\s+/g, "");
const isValidPhoneNumber = (phoneNumber) => /^\+[1-9]\d{7,14}$/.test(phoneNumber);

const buildContactResponse = async (contact, source = "manual") => ({
  _id: String(contact._id),
  contactName: contact.contactName,
  phoneNumber: contact.phoneNumber,
  source,
  matchedUser: contact.matchedUser
    ? await serializers.serializeUser(contact.matchedUser)
    : null,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

const hydrateManualContactMatches = async (contacts) => {
  const unmatchedContacts = contacts.filter(
    (contact) => !contact.matchedUser && contact.phoneNumber,
  );

  if (!unmatchedContacts.length) {
    return contacts;
  }

  const phoneNumbers = unmatchedContacts.map((contact) => contact.phoneNumber);
  const matchedUsers = await User.find({ phoneNumber: { $in: phoneNumbers } });
  const userByPhoneNumber = new Map(
    matchedUsers.map((user) => [user.phoneNumber, user]),
  );

  await Promise.all(
    unmatchedContacts.map(async (contact) => {
      const matchedUser = userByPhoneNumber.get(contact.phoneNumber);

      if (!matchedUser) {
        return;
      }

      contact.matchedUser = matchedUser._id;
      await contact.save();
      contact.matchedUser = matchedUser;
    }),
  );

  return contacts;
};

exports.getContacts = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const manualContacts = await Contact.find({ owner: ownerId })
      .populate("matchedUser")
      .sort({ updatedAt: -1, contactName: 1 });

    await hydrateManualContactMatches(manualContacts);

    const manualResponses = await Promise.all(
      manualContacts.map((contact) => buildContactResponse(contact, "manual")),
    );

    const manualUserIds = new Set(
      manualResponses
        .filter((contact) => contact.matchedUser?._id)
        .map((contact) => String(contact.matchedUser._id)),
    );

    const conversations = await Conversation.find({ participants: ownerId }).populate(
      "participants",
    );
    const conversationContacts = [];

    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        if (String(participant._id) === String(ownerId)) {
          continue;
        }

        const participantId = String(participant._id);

        if (manualUserIds.has(participantId)) {
          continue;
        }

        manualUserIds.add(participantId);
        conversationContacts.push({
          _id: `conversation-${participantId}`,
          contactName:
            participant.profile?.displayName || participant.username || "Unknown user",
          phoneNumber: participant.phoneNumber || null,
          source: "conversation",
          matchedUser: await serializers.serializeUser(participant),
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        });
      }
    }

    res.status(200).json([...manualResponses, ...conversationContacts]);
  } catch (error) {
    res.status(500).json({
      message: "Unable to load contacts right now.",
      error: error.message,
    });
  }
};

exports.createContact = async (req, res) => {
  try {
    const owner = req.user;
    const contactName = normalizeContactName(req.body.contactName);
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);

    if (!contactName) {
      return res.status(400).json({ message: "Contact name is required." });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        message: "Phone number must be in international format, for example +923001234567.",
      });
    }

    if (owner.phoneNumber && owner.phoneNumber === phoneNumber) {
      return res.status(400).json({
        message: "You cannot add your own phone number as a contact.",
      });
    }

    const matchedUser = await User.findOne({ phoneNumber });
    const existingContact = await Contact.findOne({
      owner: owner._id,
      phoneNumber,
    }).populate("matchedUser");

    if (existingContact) {
      existingContact.contactName = contactName;
      existingContact.matchedUser = matchedUser?._id || null;
      await existingContact.save();
      await existingContact.populate("matchedUser");

      return res.status(200).json({
        message: "Contact updated successfully.",
        contact: await buildContactResponse(existingContact, "manual"),
      });
    }

    const contact = await Contact.create({
      owner: owner._id,
      contactName,
      phoneNumber,
      matchedUser: matchedUser?._id || null,
    });

    await contact.populate("matchedUser");

    res.status(201).json({
      message: matchedUser
        ? "Contact added and matched with Talkora."
        : "Contact added. They are not on Talkora yet.",
      contact: await buildContactResponse(contact, "manual"),
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to save contact right now.",
      error: error.message,
    });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!contact) {
      return res.status(404).json({ message: "Contact not found." });
    }

    res.status(200).json({ message: "Contact removed successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Unable to remove contact right now.",
      error: error.message,
    });
  }
};
