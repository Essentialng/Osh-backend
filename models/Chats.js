const { Schema, model } = require("mongoose");

const ChatsSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    discourse: [
      {
        type: Schema.Types.ObjectId,
        ref: "discourse",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("chats", ChatsSchema);
