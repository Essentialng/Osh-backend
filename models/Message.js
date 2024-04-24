const { Schema, model } = require("mongoose");

const MessageSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: "posts",
    },
    text: {
      type: String,
    },
    replyTo: {
      type: String,
    },
    files: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model("messages", MessageSchema);
