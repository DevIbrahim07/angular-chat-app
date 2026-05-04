const Message = require("../../models/Message.model");
const storageService = require("../../services/storage.service");
const serializers = require("../../services/serializers");

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

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Attachment file is required." });
    }

    const storedFile = await storageService.storeUploadedFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      prefix: "attachments",
    });

    res.status(201).json({
      attachment: await serializers.serializeAttachment({
        originalName: req.file.originalname,
        url: storedFile.url,
        storageProvider: storedFile.storageProvider,
        storageKey: storedFile.storageKey,
        bucket: storedFile.bucket,
        mimeType: req.file.mimetype,
        size: req.file.size,
      }),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error uploading attachment",
      error: error.message,
    });
  }
};
