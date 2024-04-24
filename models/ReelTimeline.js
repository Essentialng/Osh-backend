const { Schema, model } = require("mongoose");

const ReelTimelineSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "reel",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("reelTimeline", ReelTimelineSchema);
