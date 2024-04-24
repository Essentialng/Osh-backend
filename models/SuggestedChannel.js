const { Schema, model } = require("mongoose");

const SuggestedChannelSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    suggestedChannels: [
      {
        type: Schema.Types.ObjectId,
        ref: "channel",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("suggestedChannel", SuggestedChannelSchema);
