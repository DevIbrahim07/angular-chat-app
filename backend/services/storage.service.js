const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const uploadsRoot = path.join(__dirname, "../uploads");
const attachmentsDirectory = path.join(uploadsRoot, "attachments");
const avatarsDirectory = path.join(uploadsRoot, "avatars");

fs.mkdirSync(attachmentsDirectory, { recursive: true });
fs.mkdirSync(avatarsDirectory, { recursive: true });

const getStorageConfig = () => ({
  bucketName: process.env.TIGRIS_BUCKET_NAME || process.env.BUCKET_NAME || "",
  endpoint:
    process.env.TIGRIS_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3 || "",
  region: process.env.TIGRIS_REGION || process.env.AWS_REGION || "auto",
  accessKeyId:
    process.env.TIGRIS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey:
    process.env.TIGRIS_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    "",
  signedUrlExpiresIn: Number(
    process.env.TIGRIS_SIGNED_URL_EXPIRES_IN || 60 * 60 * 12,
  ),
});

const getS3Client = () => {
  const config = getStorageConfig();

  if (
    !config.bucketName ||
    !config.endpoint ||
    !config.accessKeyId ||
    !config.secretAccessKey
  ) {
    return null;
  }

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

const guessExtension = (mimeType = "") => {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "application/pdf":
      return ".pdf";
    case "text/plain":
      return ".txt";
    default:
      return "";
  }
};

const safeFilename = (originalName = "", mimeType = "") => {
  const extension = path.extname(originalName || "").toLowerCase();
  const safeExtension = extension && extension.length <= 8 ? extension : guessExtension(mimeType);
  const baseName = path
    .basename(originalName || "file", extension)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 60);

  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${
    baseName || "file"
  }${safeExtension}`;
};

const localUrlFor = (directoryName, filename) => `/uploads/${directoryName}/${filename}`;

const localDirectoryForPrefix = (prefix) =>
  prefix === "avatars" ? avatarsDirectory : attachmentsDirectory;

const storeLocally = async ({ buffer, originalName, mimeType, prefix }) => {
  const filename = safeFilename(originalName, mimeType);
  const directory = localDirectoryForPrefix(prefix);
  const destination = path.join(directory, filename);

  await fs.promises.writeFile(destination, buffer);

  return {
    storageProvider: "local",
    storageKey: "",
    bucket: "",
    url: localUrlFor(prefix, filename),
  };
};

const isConfigured = () => {
  const config = getStorageConfig();

  return Boolean(
    config.bucketName &&
      config.endpoint &&
      config.accessKeyId &&
      config.secretAccessKey,
  );
};

const uploadBufferToTigris = async ({ buffer, originalName, mimeType, prefix }) => {
  const config = getStorageConfig();
  const s3Client = getS3Client();
  const filename = safeFilename(originalName, mimeType);
  const key = `${prefix}/${filename}`;

  if (!s3Client || !config.bucketName) {
    throw new Error("Tigris storage is not configured.");
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "private, max-age=0, no-store",
    }),
  );

  return {
    storageProvider: "tigris",
    storageKey: key,
    bucket: config.bucketName,
    url: await getSignedObjectUrl(key, originalName),
  };
};

const storeUploadedFile = async ({ buffer, originalName, mimeType, prefix }) => {
  if (!buffer || buffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (!prefix) {
    throw new Error("Upload prefix is required.");
  }

  if (isConfigured()) {
    return uploadBufferToTigris({ buffer, originalName, mimeType, prefix });
  }

  return storeLocally({ buffer, originalName, mimeType, prefix });
};

const getSignedObjectUrl = async (
  key,
  fileName = "",
  disposition = "inline",
) => {
  const config = getStorageConfig();
  const s3Client = getS3Client();

  if (!key) {
    return "";
  }

  if (!s3Client || !config.bucketName) {
    return key;
  }

  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      ResponseContentDisposition: fileName
        ? `${disposition}; filename="${fileName.replace(/"/g, "")}"`
        : undefined,
    }),
    { expiresIn: config.signedUrlExpiresIn },
  );
};

module.exports = {
  attachmentsDirectory,
  avatarsDirectory,
  getS3Client,
  getSignedObjectUrl,
  getStorageConfig,
  isConfigured,
  localUrlFor,
  storeUploadedFile,
};
