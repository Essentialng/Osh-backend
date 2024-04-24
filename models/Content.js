const { Schema, model } = require("mongoose");

const ContentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    text: {
      type: String
    },
    files: {
      type: Array,
      default: [],
    },
    hashtag: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("content", ContentSchema);
