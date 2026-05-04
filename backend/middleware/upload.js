const multer = require("multer");

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  attachmentUpload,
};
