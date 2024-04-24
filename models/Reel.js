const { Schema, model } = require("mongoose");

const ReelSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    video: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "comment",
      },
    ],
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    shared: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    clicks: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("reel", ReelSchema);
