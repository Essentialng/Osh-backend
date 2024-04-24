const { Schema, model } = require("mongoose");

const PostSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    text: {
      type: Schema.Types.ObjectId,
      ref: "content",
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "post",
      },
    ],
    group: {
      type: Schema.Types.ObjectId,
      ref: "group",
    },
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
    saved: [
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

module.exports = model("post", PostSchema);
