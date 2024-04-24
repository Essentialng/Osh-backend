const { Schema, model } = require("mongoose");

const StatusContentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    media: {
      text: {
        type: String,
      },
      backgroundColor: {
        type: String,
      },
      caption: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

module.exports = model("statusContent", StatusContentSchema);
