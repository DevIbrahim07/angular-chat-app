const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    matchedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

contactSchema.index({ owner: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model("Contact", contactSchema);
