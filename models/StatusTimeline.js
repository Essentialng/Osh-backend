const { Schema, model } = require("mongoose");

const StatusTimelineSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "users",
    },
    status: [
      {
        type: Schema.Types.ObjectId,
        ref: "status",
      },
    ],
  },
  { timestamps: true }
);

module.exports = model("statusTimeline", StatusTimelineSchema);
