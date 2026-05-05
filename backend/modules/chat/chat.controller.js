const Message = require("../../models/Message.model");
const fs = require("fs");
const path = require("path");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
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

exports.downloadAttachment = async (req, res) => {
  try {
    const storageProvider = String(req.query.storageProvider || "local");
    const storageKey = String(req.query.storageKey || "");
    const originalName = String(req.query.originalName || "attachment");
    const fileUrl = String(req.query.url || "");

    if (storageProvider === "tigris") {
      const s3Client = storageService.getS3Client();
      const storageConfig = storageService.getStorageConfig();

      if (!s3Client || !storageConfig.bucketName || !storageKey) {
        return res.status(400).json({ message: "Attachment is not available." });
      }

      const objectResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: storageConfig.bucketName,
          Key: storageKey,
          ResponseContentDisposition: `attachment; filename="${originalName.replace(/"/g, "")}"`,
        }),
      );

      res.setHeader(
        "Content-Type",
        objectResponse.ContentType || "application/octet-stream",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${originalName.replace(/"/g, "")}"`,
      );

      if (objectResponse.Body && typeof objectResponse.Body.pipe === "function") {
        objectResponse.Body.pipe(res);
        return;
      }

      return res.status(500).json({ message: "Unable to stream attachment." });
    }

    if (!fileUrl.startsWith("/uploads/")) {
      return res.status(400).json({ message: "Attachment is not available." });
    }

    const uploadsRoot = path.join(__dirname, "../../uploads");
    const relativePath = fileUrl.replace(/^\/+/, "").replace(/^uploads\//, "");
    const absolutePath = path.join(uploadsRoot, relativePath);

    if (!absolutePath.startsWith(uploadsRoot)) {
      return res.status(400).json({ message: "Invalid attachment path." });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Attachment file not found." });
    }

    return res.download(absolutePath, originalName);
  } catch (error) {
    return res.status(500).json({
      message: "Error downloading attachment",
      error: error.message,
    });
  }
};
